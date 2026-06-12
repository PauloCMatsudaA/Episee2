import subprocess
import shutil
import os
import asyncio
import logging
import queue
import cv2
import numpy as np
from datetime import datetime
from threading import Thread
from app.core.sector_epi_config import get_epis_obrigatorios
from app.services.telegram_service import enviar_alerta_telegram


logger = logging.getLogger(__name__)



HLS_DIR = "hls_streams"
os.makedirs(HLS_DIR, exist_ok=True)



_base = os.path.dirname(__file__)
MODEL_PATH = os.path.join(_base, "..", "..", "best.pt")
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = os.path.join(_base, "..", "..", "..", "best.pt")



VIDEO_FALLBACK = os.path.join(os.getcwd(), "..", "teste.mp4")
if not os.path.exists(VIDEO_FALLBACK):
    VIDEO_FALLBACK = os.path.join(os.getcwd(), "teste.mp4")



CLASSE_PESSOA = {"person"}

CLASSES_EPI = {
    "glasses",
    "face-mask-medical",
    "face-guard",
    "earmuffs",
    "gloves",
    "safety-vest",
    "helmet",
    "medical-suit",
    "safety-suit",
}

async def get_epis_obrigatorios_do_setor(sector_id: int | None) -> set[str]:
    if sector_id is None:
        return {"safety-vest"}
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.sector import Sector
        from sqlalchemy import select as sa_select         
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                sa_select(Sector).where(Sector.id == sector_id)
            )
            sector = result.scalar_one_or_none()
            if sector and sector.epis_obrigatorios:
                epis = set(sector.epis_obrigatorios)
                logger.info(f"[SETOR {sector_id}] EPIs obrigatórios: {epis}")
                return epis
    except Exception as e:
        logger.error(f"[SETOR {sector_id}] Erro ao buscar EPIs do banco: {e}", exc_info=True)
    return {"safety-vest"}



CONFIANCA_MINIMA = 0.50
INTERVALO_SALVAR = 30
YOLO_INTERVALO = 0.3



processos_ffmpeg: dict[int, subprocess.Popen] = {}
tarefas_deteccao: dict[int, asyncio.Task] = {}



_model = None



FFMPEG_BIN = (
    shutil.which("ffmpeg")
    or r"C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe"
)



def get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            _model = YOLO(MODEL_PATH)
            logger.info(f"[YOLO] Modelo carregado: {os.path.abspath(MODEL_PATH)}")
            logger.info(f"[YOLO] Classes: {_model.names}")
        except Exception as e:
            logger.error(f"[YOLO] Erro ao carregar modelo: {e}")
            _model = None
    return _model



def is_local_webcam_source(fonte) -> bool:
    if isinstance(fonte, int):
        return True
    if isinstance(fonte, str) and fonte.strip().isdigit():
        return True
    return False



def normalize_camera_source(rtsp_url: str | None):
    if not rtsp_url:
        return os.path.abspath(VIDEO_FALLBACK)

    raw = str(rtsp_url).strip()

    if raw.isdigit():
        return int(raw)

    return raw



def iniciar_hls(camera_id: int, source):
    pasta = os.path.join(HLS_DIR, str(camera_id))
    os.makedirs(pasta, exist_ok=True)

    if is_local_webcam_source(source):
        logger.info(f"[HLS] Camera {camera_id} e webcam local — HLS sera iniciado via pipe OpenCV->FFmpeg")
        return

    m3u8 = os.path.join(pasta, "index.m3u8")

    if camera_id in processos_ffmpeg:
        if processos_ffmpeg[camera_id].poll() is None:
            return
        del processos_ffmpeg[camera_id]

    if not FFMPEG_BIN:
        logger.error("[HLS] ffmpeg nao encontrado!")
        return

    cmd = [
        FFMPEG_BIN,
        "-rtsp_transport", "tcp",
        "-i", source,
        "-c:v", "copy",
        "-an",
        "-f", "hls",
        "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments+append_list",
        "-y", m3u8,
    ]

    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        processos_ffmpeg[camera_id] = proc
        logger.info(f"[HLS] Iniciado camera {camera_id} (RTSP)")
    except Exception as e:
        logger.error(f"[HLS] Erro ao iniciar ffmpeg: {e}")



def iniciar_hls_pipe(camera_id: int, width: int, height: int, fps: int = 15):
    pasta = os.path.join(HLS_DIR, str(camera_id))
    os.makedirs(pasta, exist_ok=True)
    m3u8 = os.path.join(pasta, "index.m3u8")

    if not FFMPEG_BIN:
        logger.error("[HLS-PIPE] ffmpeg nao encontrado!")
        return None

    cmd = [
        FFMPEG_BIN,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "bgr24",
        "-s", f"{width}x{height}",
        "-r", str(fps),
        "-i", "pipe:0",
        "-an",
        "-vf", "scale=640:360",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-tune", "zerolatency",
        "-pix_fmt", "yuv420p",
        "-f", "hls",
        "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments+append_list",
        m3u8,
    ]

    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        logger.info(f"[HLS-PIPE] FFmpeg pipe iniciado para camera {camera_id} ({width}x{height}@{fps}fps)")
        return proc
    except Exception as e:
        logger.error(f"[HLS-PIPE] Erro ao iniciar: {e}")
        return None



def parar_hls(camera_id: int):
    proc = processos_ffmpeg.pop(camera_id, None)
    if proc:
        proc.terminate()
    task = tarefas_deteccao.pop(camera_id, None)
    if task:
        task.cancel()
    logger.info(f"[CAM {camera_id}] Stream e deteccao encerrados.")



class FrameReader(Thread):
    def __init__(self, fonte, camera_id: int):
        super().__init__(daemon=True)
        self.fonte = fonte
        self.camera_id = camera_id
        self.frame_q = queue.Queue(maxsize=1)
        self.running = True
        self.frame_num = 0

    def _open_capture(self):
        if is_local_webcam_source(self.fonte):
            fonte_local = int(self.fonte)
            logger.info(f"[CAM {self.camera_id}] Abrindo webcam local indice {fonte_local}")
            cap = cv2.VideoCapture(fonte_local, cv2.CAP_DSHOW)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 15)
            return cap

        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        cap = cv2.VideoCapture(self.fonte, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def run(self):
        import time
        logger.info(f"[CAM {self.camera_id}] FrameReader tentando: {self.fonte}")
        cap = self._open_capture()

        # ✅ CORREÇÃO: retry para webcam local antes de ir pro fallback
        if not cap.isOpened():
            if is_local_webcam_source(self.fonte):
                for tentativa in range(5):
                    logger.warning(f"[CAM {self.camera_id}] Webcam nao abriu, tentativa {tentativa + 1}/5...")
                    time.sleep(2)
                    cap = self._open_capture()
                    if cap.isOpened():
                        break

            if not cap.isOpened():
                fallback = os.path.abspath(VIDEO_FALLBACK)
                logger.warning(f"[CAM {self.camera_id}] Fonte principal falhou -> fallback: {fallback}")
                self.fonte = fallback
                cap = cv2.VideoCapture(self.fonte)

        if not cap.isOpened():
            logger.error(f"[CAM {self.camera_id}] Nao abriu nenhuma fonte!")
            return

        logger.info(f"[CAM {self.camera_id}] FrameReader OK -> {self.fonte}")

        while self.running:
            ret, frame = cap.read()
            if not ret:
                if isinstance(self.fonte, str) and "teste.mp4" in self.fonte:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                # ✅ CORREÇÃO: webcam local nao tenta reconectar como RTSP, apenas ignora frame perdido
                if is_local_webcam_source(self.fonte):
                    logger.warning(f"[CAM {self.camera_id}] Webcam perdeu frame — ignorando")
                    continue

                logger.warning(f"[CAM {self.camera_id}] Frame perdido — reconectando em 3s...")
                cap.release()

                time.sleep(3)

                cap = self._open_capture() if self.fonte != os.path.abspath(VIDEO_FALLBACK) else cv2.VideoCapture(self.fonte)
                continue

            self.frame_num += 1
            try:
                self.frame_q.get_nowait()
            except queue.Empty:
                pass
            self.frame_q.put((self.frame_num, frame))

        cap.release()
        logger.info(f"[CAM {self.camera_id}] FrameReader encerrado.")

    def stop(self):
        self.running = False



def inferir_frame(frame: np.ndarray) -> list[dict]:
    model = get_model()
    if model is None:
        return []

    results = model(frame, conf=CONFIANCA_MINIMA, verbose=False)
    deteccoes = []

    for r in results:
        for box in r.boxes:
            nome = model.names[int(box.cls)].lower()
            deteccoes.append({
                "class": nome,
                "confidence": round(float(box.conf), 4),
                "bbox": box.xyxy[0].tolist(),
            })

    return deteccoes


def avaliar_deteccoes(deteccoes: list[dict], epis_obrigatorios: set[str] | None = None) -> dict:
    if epis_obrigatorios is None:
        epis_obrigatorios = {"safety-vest"}

    classes = {d["class"] for d in deteccoes}
    pessoa_detectada = bool(classes & CLASSE_PESSOA)
    epis_encontrados = classes & CLASSES_EPI
    epis_ausentes = epis_obrigatorios - epis_encontrados

    if not pessoa_detectada:
        status = "sem_pessoa"
    elif not epis_ausentes:
        status = "conforme"
    else:
        status = "nao_conforme"

    confianca = max((d["confidence"] for d in deteccoes), default=0.0)

    return {
        "status": status,
        "epi_detected": list(epis_encontrados),
        "epis_ausentes": list(epis_ausentes),
        "epis_obrigatorios": list(epis_obrigatorios),
        "pessoa_detectada": pessoa_detectada,
        "confidence": confianca,
        "detections": deteccoes,
    }


async def salvar_ocorrencia(camera_id: int, sector_id: int, resultado: dict, frame: np.ndarray):
    from app.core.database import AsyncSessionLocal
    from app.models.occurrence import Occurrence, OccurrenceStatus
    from app.models.notification import Notification
    from app.models.user import User, UserRole
    from sqlalchemy import select

    image_path = None
    try:
        img_dir = f"hls_streams/{camera_id}/frames"
        os.makedirs(img_dir, exist_ok=True)
        image_path = f"{img_dir}/{int(datetime.utcnow().timestamp())}.jpg"
        cv2.imwrite(image_path, frame)
    except Exception as e:
        logger.warning(f"[CAM {camera_id}] Erro ao salvar frame: {e}")

    try:
        async with AsyncSessionLocal() as db:
            # ✅ CORREÇÃO: status dinamico baseado no resultado real
            occ = Occurrence(
                camera_id=camera_id,
                sector_id=sector_id,
                status=OccurrenceStatus[resultado["status"]],
                epi_detected=resultado["epi_detected"],
                confidence=resultado["confidence"],
                image_path=image_path,
                timestamp=datetime.utcnow(),
            )
            db.add(occ)
            await db.flush()

            # Notifica gestores apenas quando nao_conforme
            gestores = []
            if resultado["status"] == "nao_conforme":
                ausentes_str = ", ".join(resultado["epis_ausentes"]) or "EPI nao identificado"
                texto = (
                    f"[ALERTA] Pessoa sem EPI - Camera {camera_id} | "
                    f"Faltando: {ausentes_str} | "
                    f"Confianca: {resultado['confidence'] * 100:.0f}%"
                )

                res = await db.execute(
                    select(User).where(
                        User.role == UserRole.gestor,
                        User.is_active == True,
                    )
                )
                gestores = res.scalars().all()
                logger.info(f"[CAM {camera_id}] Gestores para notificar: {len(gestores)}")

                for g in gestores:
                    db.add(Notification(
                        user_id=g.id,
                        tipo="err",
                        texto=texto,
                        lida=False,
                    ))
                    # Envia alerta pelo Telegram se o gestor tiver phone cadastrado
                    if g.phone:
                        mensagem_tg = (
                            f" <b>ALERTA de não Conformidade</b>\n\n"
                            f"Câmera: <b>{camera_id}</b>\n"
                            f"EPIs faltando: <b>{ausentes_str}</b>\n"
                            f"Confiança: <b>{resultado['confidence'] * 100:.0f}%</b>\n"
                            f"Horário: <b>{datetime.utcnow().strftime('%d/%m/%Y %H:%M:%S')} UTC</b>"
                        )
                        # Fire-and-forget: não bloqueia o loop principal
                        asyncio.create_task(
                            enviar_alerta_telegram(g.phone, mensagem_tg)
                        )

            await db.commit()
            logger.info(
                f"[CAM {camera_id}] Ocorrencia #{occ.id} salva | "
                f"Status: {resultado['status']} | "
                f"Faltando: {resultado['epis_ausentes']} | "
                f"Notificados: {len(gestores)} gestor(es)"
            )
    except Exception as e:
        logger.error(f"[CAM {camera_id}] Erro ao salvar ocorrencia: {e}", exc_info=True)



async def processar_stream_camera(camera_id: int, fonte, sector_id: int):
    epis_obrigatorios = await get_epis_obrigatorios_do_setor(sector_id) 

    reader = FrameReader(fonte, camera_id)
    reader.start()
    ultimo_save = datetime.min
    loop = asyncio.get_event_loop()

    hls_pipe_proc = None
    hls_pipe_iniciado = False

    try:
        while True:
            await asyncio.sleep(YOLO_INTERVALO)

            try:
                frame_num, frame = reader.frame_q.get(timeout=2)
            except queue.Empty:
                logger.warning(f"[CAM {camera_id}] Sem frames na queue — aguardando...")
                continue

            if is_local_webcam_source(fonte) and not hls_pipe_iniciado:
                h, w = frame.shape[:2]
                hls_pipe_proc = iniciar_hls_pipe(camera_id, w, h, fps=15)
                hls_pipe_iniciado = True

            if hls_pipe_proc and hls_pipe_proc.poll() is None:
                try:
                    hls_pipe_proc.stdin.write(frame.tobytes())
                except Exception:
                    logger.warning(f"[CAM {camera_id}] Pipe HLS quebrou — tentando reiniciar")
                    hls_pipe_proc = None
                    hls_pipe_iniciado = False

            deteccoes = await loop.run_in_executor(None, inferir_frame, frame)
            resultado = avaliar_deteccoes(deteccoes, epis_obrigatorios=epis_obrigatorios)


            logger.info(
                f"[CAM {camera_id}] Frame {frame_num:05d} | "
                f"status={resultado['status']} | "
                f"EPIs={resultado['epi_detected']} | "
                f"faltando={resultado['epis_ausentes']} | "
                f"conf={resultado['confidence']:.2f}"
            )

            if not resultado["pessoa_detectada"]:
                continue

            agora = datetime.utcnow()
            if (agora - ultimo_save).total_seconds() < INTERVALO_SALVAR:
                continue

            await salvar_ocorrencia(camera_id, sector_id, resultado, frame)
            ultimo_save = agora

    except asyncio.CancelledError:
        logger.info(f"[CAM {camera_id}] Deteccao cancelada.")
    finally:
        reader.stop()
        if hls_pipe_proc and hls_pipe_proc.poll() is None:
            try:
                hls_pipe_proc.stdin.close()
                hls_pipe_proc.terminate()
            except Exception:
                pass



async def start_camera_streams():
    await asyncio.sleep(2)

    logger.info(">>> [STARTUP] start_camera_streams chamado <<<")

    try:
        from app.core.database import AsyncSessionLocal
        from app.models.camera import Camera
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Camera).where(Camera.is_active == True))
            cameras = result.scalars().all()

        logger.info(f"[STARTUP] {len(cameras)} camera(s) ativa(s) encontrada(s).")

        model_existe = os.path.exists(MODEL_PATH)
        logger.info(f"[STARTUP] best.pt encontrado: {model_existe} -> {os.path.abspath(MODEL_PATH)}")

        fontes_em_uso: set = set()

        for cam in cameras:
            fonte = normalize_camera_source(cam.rtsp_url)
            chave = str(fonte)  # "0", "1", ou URL RTSP

            if chave in fontes_em_uso:
                logger.error(
                    f"[STARTUP] ⚠️  Camera {cam.id} ({cam.name}) ignorada — "
                    f"fonte '{chave}' já está em uso por outra câmera. "
                    f"Corrija o rtsp_url no banco de dados."
                )
                continue

            fontes_em_uso.add(chave)
            sector_id = cam.sector_id or 1
            logger.info(f"[STARTUP] Camera {cam.id} ({cam.name}) -> {fonte}")

            iniciar_hls(cam.id, fonte)
            task = asyncio.create_task(
                processar_stream_camera(cam.id, fonte, sector_id)
            )
            tarefas_deteccao[cam.id] = task
            logger.info(f"[STARTUP] Deteccao real-time iniciada: camera {cam.id}")

    except Exception as e:
        logger.error(f"[STARTUP] Erro: {e}", exc_info=True)

    try:
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        logger.info("[STARTUP] start_camera_streams encerrado.")



async def analyze_frame(camera_id: int, frame_data: bytes, sector_id: int | None = None) -> dict:
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"status": "erro", "detections": [], "epi_detected": [],
                "epis_ausentes": [], "pessoa_detectada": False, "confidence": 0.0}

    epis = await get_epis_obrigatorios_do_setor(sector_id)    # ← busca correto
    deteccoes = inferir_frame(frame)
    return avaliar_deteccoes(deteccoes, epis_obrigatorios=epis)


async def analisar_frame(camera_id: int, frame: np.ndarray, sector_id: int | None = None) -> dict:
    epis = await get_epis_obrigatorios_do_setor(sector_id)     # ← busca correto
    deteccoes = await asyncio.get_event_loop().run_in_executor(None, inferir_frame, frame)
    return avaliar_deteccoes(deteccoes, epis_obrigatorios=epis)
