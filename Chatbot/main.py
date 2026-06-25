import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.webhook import router as webhook_router
from app.api.chat import router as chat_router
from app.api.telegram_webhook import router as telegram_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

app = FastAPI(
    title="EPIsee Chatbot",
    description=(
    ),
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook_router, prefix="/api/v1", tags=["WhatsApp Webhook"])
app.include_router(chat_router, tags=["Chat App Mobile"])
app.include_router(telegram_router, prefix="/api/v1", tags=["Telegram Webhook"])

@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": "EPIsee Chatbot",
        "version": "1.1.0",
    }

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
