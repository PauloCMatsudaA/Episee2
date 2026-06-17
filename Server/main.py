import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.sector import Sector
from app.api import notifications
from app.api import reports
from app.api.telegram import router as telegram_router
from app.api.training_videos import router as training_router

import app.models

from app.api import (
    auth, users, occurrences, epi_requests,
    cameras, sectors, dashboard, detection,
)
from app.api.chatbot import router as chatbot_router
from app.services.detection_service_real import start_camera_streams

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HLS_DIR = Path("hls_streams")
HLS_DIR.mkdir(exist_ok=True)

MODEL_PATH = Path("best.pt")
MODEL_URL = "https://huggingface.co/MatsudaPaulo/episeeyolo/resolve/main/best.pt"

# Origens permitidas — adicione aqui os dominios do seu frontend no Railway
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://lucid-rejoicing-production-d2f8.up.railway.app",
    "https://episee2-production.up.railway.app",
]

# Lê origens extras via variável de ambiente (separadas por vírgula)
_extra = os.environ.get("CORS_ORIGINS", "")
if _extra:
    for _o in _extra.split(","):
        _o = _o.strip()
        if _o and _o not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(_o)


async def download_model_if_needed():
    if MODEL_PATH.exists():
        logger.info(f"[MODEL] best.pt ja existe ({MODEL_PATH.stat().st_size / 1024 / 1024:.1f} MB) - pulando download.")
        return

    logger.info(f"[MODEL] Baixando best.pt de {MODEL_URL} ...")
    headers = {}
    hf_token = os.environ.get("HF_TOKEN", "")
    if hf_token:
        headers["Authorization"] = f"Bearer {hf_token}"

    try:
        async with httpx.AsyncClient(timeout=300, follow_redirects=True) as client:
            async with client.stream("GET", MODEL_URL, headers=headers) as response:
                response.raise_for_status()
                total = int(response.headers.get("content-length", 0))
                downloaded = 0
                with open(MODEL_PATH, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total:
                            pct = downloaded / total * 100
                            logger.info(f"[MODEL] Download: {pct:.1f}% ({downloaded // 1024 // 1024}MB / {total // 1024 // 1024}MB)")
        logger.info(f"[MODEL] best.pt baixado com sucesso! ({MODEL_PATH.stat().st_size / 1024 / 1024:.1f} MB)")
    except Exception as e:
        logger.error(f"[MODEL] Falha ao baixar best.pt: {e}")
        logger.warning("[MODEL] Deteccao por camera pode nao funcionar.")


async def create_default_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Sector).where(Sector.name == "Geral"))
        default_sector = result.scalar_one_or_none()
        if not default_sector:
            default_sector = Sector(name="Geral", description="Setor padrao do sistema")
            db.add(default_sector)
            await db.flush()
            await db.refresh(default_sector)
            logger.info("Setor padrao 'Geral' criado.")

        result = await db.execute(select(User).where(User.email == "admin@episee.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                name="Administrador EPIsee",
                email="admin@episee.com",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.gestor,
                sector_id=default_sector.id,
                phone="+5511999999999",
            )
            db.add(admin)
            await db.flush()
            logger.info("Usuario padrao admin@episee.com criado.")
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server iniciando")
    await init_db()
    await create_default_admin()
    await download_model_if_needed()

    camera_task = asyncio.create_task(start_camera_streams())
    logger.info("Server de cameras iniciando.")

    yield

    logger.info("Encerrando.")
    camera_task.cancel()
    try:
        await camera_task
    except asyncio.CancelledError:
        pass
    logger.info("Encerrando servidor.")


app = FastAPI(
    title="EPIsee API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/hls/{camera_id}/{filename}")
async def serve_hls(camera_id: str, filename: str):
    if ".." in camera_id or ".." in filename:
        raise HTTPException(status_code=400, detail="Caminho invalido")

    file_path = HLS_DIR / camera_id / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado")

    if filename.endswith(".m3u8"):
        media_type = "application/vnd.apple.mpegurl"
    elif filename.endswith(".ts"):
        media_type = "video/mp2t"
    else:
        media_type = "application/octet-stream"

    content = file_path.read_bytes()

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
        },
    )


API_PREFIX = "/api"

app.include_router(auth.router,           prefix=API_PREFIX)
app.include_router(users.router,          prefix=API_PREFIX)
app.include_router(occurrences.router,    prefix=API_PREFIX)
app.include_router(epi_requests.router,   prefix=API_PREFIX)
app.include_router(cameras.router,        prefix=API_PREFIX)
app.include_router(sectors.router,        prefix=API_PREFIX)
app.include_router(dashboard.router,      prefix=API_PREFIX)
app.include_router(detection.router,      prefix=API_PREFIX)
app.include_router(reports.router,        prefix=API_PREFIX)
app.include_router(notifications.router,  prefix=API_PREFIX)
app.include_router(training_router,       prefix=API_PREFIX)
app.include_router(chatbot_router,        prefix=API_PREFIX)
app.include_router(telegram_router,       prefix=API_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "EPIsee API", "version": "1.0.0"}


@app.get("/", tags=["Health"])
async def root():
    return {"message": "EPIsee API esta rodando.", "docs": "/docs", "health": "/health"}


@app.on_event("startup")
async def registrar_webhook_telegram():
    token       = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    url_webhook = getattr(settings, "APP_URL", "")

    if not token or not url_webhook:
        return

    webhook_url = f"{url_webhook}/api/telegram/webhook"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={"url": webhook_url, "drop_pending_updates": True},
        )
        if resp.status_code == 200:
            print(f"[TELEGRAM] Webhook registrado: {webhook_url}")
        else:
            print(f"[TELEGRAM] Falha ao registrar webhook: {resp.text}")
