"""
EPIsee Chatbot — Entry point da aplicação FastAPI.

Execução:
    uvicorn main:app --host 0.0.0.0 --port 8001 --reload
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.webhook import router as webhook_router
from app.api.chat import router as chat_router

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

app = FastAPI(
    title="EPIsee Chatbot",
    description="Chatbot especialista em EPIs via WhatsApp e App Mobile — NR-6, direitos do trabalhador e orientações de segurança.",
    version="1.0.0",
)

# CORS — necessário para o app mobile e painel web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rotas ─────────────────────────────────────────────────────────────────────
app.include_router(webhook_router, prefix="/api/v1", tags=["WhatsApp Webhook"])
app.include_router(chat_router, tags=["Chat App Mobile"])


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": "EPIsee Chatbot",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}