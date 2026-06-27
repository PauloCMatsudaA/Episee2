import subprocess
import shutil
import os
import asyncio
import logging
import queue
from datetime import datetime
from threading import Thread
from app.services.telegram_service import enviar_alerta_telegram

logger = logging.getLogger(__name__)

HLS_DIR = "hls_streams"
os.makedirs(HLS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(os.getcwd(), "best.pt")

VIDEO_FALLBACK = os.path.join(os.getcwd(), "teste.mp4")
if not os.path.exists(VIDEO_FALLBACK):
    VIDEO_FALLBACK = os.path.join(os.getcwd(), "..", "teste.mp4")

CLASSE_PESSOA   = {"person"}
CLASSE_CABECA   = {"head"}
CLASSE_CAPACETE = {"helmet"}
CLASSES_EPI = {
    "glasses", "face-mask-medical", "face-guard",
    "earmuffs", "gloves", "safety-vest",
    "helmet", "medical-suit", "safety-suit",
}

EPIS_FACIAIS = {"helmet", "glasses", "face-mask-medical", "face-guard", "earmuffs"}
EPIS_TORSO = {"safety-vest"}
EPIS_SEM_INTERSECAO = {"gloves", "medical-suit", "safety-suit"}

CONFIANCA_MINIMA  = 0.45
INTERVALO_SALVAR  = 30
YOLO_INTERVALO    = 0.3
IOUI_HELMET_HEAD  = 0.25
IOUI_VEST_PERSON  = 0.15

processos_ffmpeg: dict[int, subprocess.Popen] = {}
tarefas_deteccao: dict[int, asyncio.Task]      = {}

_model = None

_sse_subscribers: list[asyncio.Queue] = []

def sse_subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=20)
    _sse_subscribers.append(q)
    return q

def sse_unsubscribe(q: asyncio.Queue):
    try:
        _sse_subscribers.remove(q)
    except ValueError:
        pass

def _sse_publish(evento: dict):
    mortos = []
    for q in _sse_subscribers:
        try:
            q.put_nowait(evento)
        except asyncio.QueueFull:
            mortos.append(q)
    for q in mortos:
        sse_unsubscribe(q)

def _find_ffmpeg() -> str | None:
    found = shutil.which("ffmpeg")
    if found:
        return found

    linux_paths = [
        "/usr/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
    ]
    for p in linux_paths:
        if os.path.isfile(p):
            return p

    windows_paths = [
        r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
    ]
    for p in windows_paths:
        if os.path.isfile(p):
            return p

    return None

FFMPEG_BIN = _find_ffmpeg()
if FFMPEG_BIN:
    logger.info(f"[HLS] ffmpeg encontrado: {FFMPEG_BIN}")
else:
    logger.warning("[HLS] ffmpeg NAO encontrado — streams HLS nao funcionarao. Instale com: apt-get install ffmpeg")

def _cv2():
    import cv2
    return cv2

def _np():
    import numpy as np
    return np

def _iou_area(boxA: list, boxB: list) -> float:
    ax1, ay1, ax2, ay2 = boxA
    bx1, by1, bx2, by2 = boxB
    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    area_b = max((bx2 - bx1) * (by2 - by1), 1)
    return inter / area_b

def epi_esta_sobre_alvo(epi_box, alvo_boxes, threshold):
    for alvo in alvo_boxes:
        if _iou_area(epi_box, alvo) >= threshold:
            return True
    return False

def capacete_esta_na_cabeca(helmet_box, head_boxes, threshold=IOUI_HELMET_HEAD):
    return epi_esta_sobre_alvo(helmet_box, head_boxes, threshold)

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
    if isinstance(fonte, str) and str(fonte).strip().isdigit():
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
        logger.info(f"[HLS] Camera {camera_id} e webcam local — HLS via pipe OpenCV->FFmpeg")
        return

    m3u8 = os.path.join(pasta, "index.m3u8")
    if camera_id in processos_ffmpeg:
        if processos_ffmpeg[camera_id].poll() is None:
            return
        del processos_ffmpeg[camera_id]

    if not FFMPEG_BIN:
        logger.error("[HLS] ffmpeg nao encontrado! Instale com: apt-get install ffmpeg")
        return

    cmd = [
        FFMPEG_BIN, "-rtsp_transport", "tcp",
        "-i", source, "-c:v", "copy", "-an",
        "-f", "hls", "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments+append_list",
        "-y", m3u8,
    ]
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        processos_ffmpeg[camera_id] = proc
        logger.info(f"[HLS] Iniciado camera {camera_id}")
    except Exception as e:
        logger.error(f"[HLS] Erro: {e}")

def iniciar_hls_pipe(camera_id: int, width: int, height: int, fps: int = 15):
    pasta = os.path.join(HLS_DIR, str(camera_id))
    os.makedirs(pasta, exist_ok=True)
    m3u8 = os.path.join(pasta, "index.m3u8")
    if not FFMPEG_BIN:
        logger.error("[HLS-PIPE] ffmpeg nao encontrado! Instale com: apt-get install ffmpeg")
        return None
    cmd = [
        FFMPEG_BIN, "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-pix_fmt", "bgr24", "-s", f"{width}x{height}",
        "-r", str(fps), "-i", "pipe:0", "-an",
        "-vf", "scale=640:360", "-c:v", "libx264",
        "-preset", "veryfast", "-tune", "zerolatency",
        "-pix_fmt", "yuv420p",
        "-f", "hls", "-hls_time", "2",
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments+append_list",
        m3u8,
    ]
    try:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        logger.info(f"[HLS-PIPE] Iniciado camera {camera_id} ({width}x{height}@{fps}fps)")
        return proc
    except Exception as e:
        logger.error(f"[HLS-PIPE] Erro: {e}")
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
        self.fonte     = fonte
        self.camera_id = camera_id
        self.frame_q   = queue.Queue(maxsize=1)
        self.running   = True
        self.frame_num = 0

    def _open_capture(self):
        cv2 = _cv2()
        if is_local_webcam_source(self.fonte):
            cap = cv2.VideoCapture(int(self.fonte), cv2.CAP_DSHOW)
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
        cv2 = _cv2()
        cap = self._open_capture()
        if not cap.isOpened():
            if is_local_webcam_source(self.fonte):
                for t in range(5):
                    logger.warning(f"[CAM {self.camera_id}] Webcam nao abriu, tentativa {t+1}/5...")
                    time.sleep(2)
                    cap = self._open_capture()
                    if cap.isOpened():
                        break
            if not cap.isOpened():
                fallback = os.path.abspath(VIDEO_FALLBACK)
                logger.warning(f"[CAM {self.camera_id}] Fallback: {fallback}")
                self.fonte = fallback
                cap = cv2.VideoCapture(self.fonte)
        if not cap.isOpened():
            logger.error(f"[CAM {self.camera_id}] Nenhuma fonte disponivel!")
            return

        while self.running:
            ret, frame = cap.read()
            if not ret:
                if isinstance(self.fonte, str) and "teste.mp4" in self.fonte:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                if is_local_webcam_source(self.fonte):
                    continue
                logger.warning(f"[CAM {self.camera_id}] Reconectando em 3s...")
                cap.release()
                time.sleep(3)
                cap = self._open_capture()
                continue
            self.frame_num += 1
            try:
                self.frame_q.get_nowait()
            except queue.Empty:
                pass
            self.frame_q.put((self.frame_num, frame))
        cap.release()

    def stop(self):
        self.running = False

def inferir_frame(frame) -> list[dict]:
    model = get_model()
    if model is None:
        return []
    results = model(
        frame,
        conf=CONFIANCA_MINIMA,
        iou=0.45,
        imgsz=640,
        verbose=False,
        augment=False,
    )
    deteccoes = []
    for r in results:
        for box in r.boxes:
            nome = model.names[int(box.cls)].lower()
            deteccoes.append({
                "class":      nome,
                "confidence": round(float(box.conf), 4),
                "bbox":       box.xyxy[0].tolist(),
            })
    return deteccoes

def _validar_epis_por_intersecao(epis_encontrados, deteccoes):
    epis_validos = set(epis_encontrados)
    head_boxes   = [d["bbox"] for d in deteccoes if d["class"] == "head"]
    person_boxes = [d["bbox"] for d in deteccoes if d["class"] == "person"]

    epis_faciais_presentes = epis_validos & EPIS_FACIAIS
    for epi in epis_faciais_presentes:
        epi_boxes = [d["bbox"] for d in deteccoes if d["class"] == epi]
        algum_vestido = any(
            epi_esta_sobre_alvo(eb, head_boxes, IOUI_HELMET_HEAD)
            for eb in epi_boxes
        )
        if not algum_vestido:
            epis_validos.discard(epi)

    if "safety-vest" in epis_validos and person_boxes:
        vest_boxes = [d["bbox"] for d in deteccoes if d["class"] == "safety-vest"]
        algum_vestido = any(
            epi_esta_sobre_alvo(vb, person_boxes, IOUI_VEST_PERSON)
            for vb in vest_boxes
        )
        if not algum_vestido:
            epis_validos.discard("safety-vest")

    return epis_validos

def avaliar_deteccoes(deteccoes, epis_obrigatorios=None):
    if epis_obrigatorios is None:
        epis_obrigatorios = {"safety-vest"}

    classes          = {d["class"] for d in deteccoes}
    pessoa_detectada = bool(classes & CLASSE_PESSOA)
    epis_encontrados = classes & CLASSES_EPI
    epis_encontrados = _validar_epis_por_intersecao(epis_encontrados, deteccoes)
    epis_ausentes    = epis_obrigatorios - epis_encontrados

    if not pessoa_detectada:
        status = "sem_pessoa"
    elif not epis_ausentes:
        status = "conforme"
    else:
        status = "nao_conforme"

    confianca = max((d["confidence"] for d in deteccoes), default=0.0)

    return {
        "status":            status,
        "epi_detected":      list(epis_encontrados),
        "epis_ausentes":     list(epis_ausentes),
        "epis_obrigatorios": list(epis_obrigatorios),
        "pessoa_detectada":  pessoa_detectada,
        "confidence":        confianca,
        "detections":        deteccoes,
    }

async def get_epis_obrigatorios_do_setor(sector_id):
    if sector_id is None:
        return {"safety-vest"}
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.sector import Sector
        from sqlalchemy import select as sa_select
        async with AsyncSessionLocal() as db:
            result = await db.execute(sa_select(Sector).where(Sector.id == sector_id))
            sector = result.scalar_one_or_none()
            if sector and sector.epis_obrigatorios:
                epis = set(sector.epis_obrigatorios)
                logger.info(f"[SETOR {sector_id}] EPIs obrigatorios: {epis}")
                return epis
    except Exception as e:
        logger.error(f"[SETOR {sector_id}] Erro ao buscar EPIs: {e}", exc_info=True)
    return {"safety-vest"}

async def salvar_ocorrencia(camera_id, sector_id, resultado, frame):
    from app.core.database import AsyncSessionLocal
    from app.models.occurrence import Occurrence, OccurrenceStatus
    from app.models.notification import Notification
    from app.models.user import User, UserRole
    from sqlalchemy import select
    cv2 = _cv2()

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

            gestores = []
            if resultado["status"] == "nao_conforme":
                ausentes_str = ", ".join(resultado["epis_ausentes"]) or "EPI nao identificado"
                texto = (
                    f"[ALERTA] Pessoa sem EPI — Camera {camera_id} | "
                    f"Faltando: {ausentes_str} | "
                    f"Confianca: {resultado['confidence'] * 100:.0f}%"
                )

                _sse_publish({
                    "id":          occ.id,
                    "camera_id":   camera_id,
                    "sector_id":   sector_id,
                    "epi_detected": resultado["epi_detected"],
                    "epis_ausentes": resultado["epis_ausentes"],
                    "confidence":  resultado["confidence"],
                    "timestamp":   datetime.utcnow().isoformat() + "Z",
                    "texto":       texto,
                })

                res = await db.execute(
                    select(User).where(
                        User.role == UserRole.gestor,
                        User.is_active == True,
                    )
                )
                gestores = res.scalars().all()
                for g in gestores:
                    db.add(Notification(
                        user_id=g.id, tipo="err",
                        texto=texto, lida=False,
                    ))
                    if g.phone:
                        mensagem_tg = (
                            f"<b>ALERTA de Nao Conformidade</b>\n\n"
                            f"Camera: <b>{camera_id}</b>\n"
                            f"EPIs faltando: <b>{ausentes_str}</b>\n"
                            f"Confianca: <b>{resultado['confidence'] * 100:.0f}%</b>\n"
                            f"Horario: <b>{datetime.utcnow().strftime('%d/%m/%Y %H:%M:%S')} UTC</b>"
                        )
                        asyncio.create_task(enviar_alerta_telegram(g.phone, mensagem_tg))

            await db.commit()
            logger.info(
                f"[CAM {camera_id}] Ocorrencia #{occ.id} | "
                f"status={resultado['status']} | faltando={resultado['epis_ausentes']} | "
                f"notificados={len(gestores)}"
            )
    except Exception as e:
        logger.error(f"[CAM {camera_id}] Erro ao salvar ocorrencia: {e}", exc_info=True)

async def processar_stream_camera(camera_id, fonte, sector_id):
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
                logger.warning(f"[CAM {camera_id}] Sem frames — aguardando...")
                continue

            if is_local_webcam_source(fonte) and not hls_pipe_iniciado:
                h, w = frame.shape[:2]
                hls_pipe_proc = iniciar_hls_pipe(camera_id, w, h, fps=15)
                hls_pipe_iniciado = True

            if hls_pipe_proc and hls_pipe_proc.poll() is None:
                try:
                    hls_pipe_proc.stdin.write(frame.tobytes())
                except Exception:
                    hls_pipe_proc = None
                    hls_pipe_iniciado = False

            deteccoes = await loop.run_in_executor(None, inferir_frame, frame)
            resultado  = avaliar_deteccoes(deteccoes, epis_obrigatorios=epis_obrigatorios)

            logger.info(
                f"[CAM {camera_id}] Frame {frame_num:05d} | "
                f"status={resultado['status']} | EPIs={resultado['epi_detected']} | "
                f"faltando={resultado['epis_ausentes']} | conf={resultado['confidence']:.2f}"
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

        logger.info(f"[STARTUP] {len(cameras)} camera(s) ativa(s)")
        model_existe = os.path.exists(MODEL_PATH)
        logger.info(f"[STARTUP] best.pt: {model_existe} → {os.path.abspath(MODEL_PATH)}")

        fontes_em_uso: set = set()
        for cam in cameras:
            fonte = normalize_camera_source(cam.rtsp_url)
            chave = str(fonte)
            if chave in fontes_em_uso:
                logger.error(f"[STARTUP] Camera {cam.id} ignorada — fonte '{chave}' ja em uso.")
                continue
            fontes_em_uso.add(chave)
            sector_id = cam.sector_id or 1
            iniciar_hls(cam.id, fonte)
            task = asyncio.create_task(processar_stream_camera(cam.id, fonte, sector_id))
            tarefas_deteccao[cam.id] = task
            logger.info(f"[STARTUP] Camera {cam.id} iniciada")
    except Exception as e:
        logger.error(f"[STARTUP] Erro: {e}", exc_info=True)

    try:
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        logger.info("[STARTUP] Encerrado.")

async def analyze_frame(camera_id, frame_data, sector_id=None):
    np = _np()
    cv2 = _cv2()
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {
            "status": "erro", "detections": [], "epi_detected": [],
            "epis_ausentes": [], "pessoa_detectada": False, "confidence": 0.0,
        }
    epis      = await get_epis_obrigatorios_do_setor(sector_id)
    deteccoes = inferir_frame(frame)
    return avaliar_deteccoes(deteccoes, epis_obrigatorios=epis)

async def analisar_frame(camera_id, frame, sector_id=None):
    epis      = await get_epis_obrigatorios_do_setor(sector_id)
    deteccoes = await asyncio.get_event_loop().run_in_executor(None, inferir_frame, frame)
    return avaliar_deteccoes(deteccoes, epis_obrigatorios=epis)
