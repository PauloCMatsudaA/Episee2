import asyncio
import logging
import os
import concurrent.futures
from contextlib import asynccontextmanager
from pathlib import Path

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


async def create_default_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Sector).where(Sector.name == "Geral"))
        default_sector = result.scalar_one_or_none()
        if not default_sector:
            default_sector = Sector(name="Geral", description="Setor padrão do sistema")
            db.add(default_sector)
            await db.flush()
            await db.refresh(default_sector)
            logger.info("Setor padrão 'Geral' criado.")

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
            logger.info("Usuário padrão admin@episee.com criado.")
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server iniciando")
    await init_db()
    await create_default_admin()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    loop = asyncio.get_event_loop()
    camera_task = loop.run_in_executor(executor, lambda: asyncio.run(start_camera_streams()))
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
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,  
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/hls/{camera_id}/{filename}")
async def serve_hls(camera_id: str, filename: str):
    if ".." in camera_id or ".." in filename:
        raise HTTPException(status_code=400, detail="Caminho inválido")

    file_path = HLS_DIR / camera_id / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

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

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router,prefix=API_PREFIX)
app.include_router(occurrences.router,prefix=API_PREFIX)
app.include_router(epi_requests.router, prefix=API_PREFIX)
app.include_router(cameras.router, prefix=API_PREFIX)
app.include_router(sectors.router,prefix=API_PREFIX)
app.include_router(dashboard.router,prefix=API_PREFIX)
app.include_router(detection.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(chatbot_router)
app.include_router(telegram_router, prefix="/api")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "EPIsee API", "version": "1.0.0"}


@app.get("/", tags=["Health"])
async def root():
    return {"message": "EPIsee API está rodando.", "docs": "/docs", "health": "/health"}

@app.on_event("startup")
async def registrar_webhook_telegram():
    import httpx
    from app.core.config import settings

    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    url_webhook = getattr(settings, "APP_URL", "")  # ex: https://abc.ngrok.io

    if not token or not url_webhook:
        return  # silencioso se não configurado

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