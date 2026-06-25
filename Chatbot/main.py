from fastapi import FastAPI
from app.api.chat import router as chat_router
from app.api.webhook import router as webhook_router
from app.api.telegram_webhook import router as telegram_router

app = FastAPI(title="Episee Chatbot")

app.include_router(chat_router, prefix="/api")
app.include_router(webhook_router, prefix="/api")
app.include_router(telegram_router, prefix="/api")
