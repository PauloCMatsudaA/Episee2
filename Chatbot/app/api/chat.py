"""
EPIsee Chatbot — Endpoint direto para o app mobile.

Rota:
    POST /chat
    Body:  { "message": "string", "phone": "string" }
    Retorno: { "reply": "string" }

Não depende do WhatsApp — usado diretamente pelo ChatScreen do app.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.chat_service import get_chat_response, clear_history

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    phone: str = Field(default="app-user")


class ChatResponse(BaseModel):
    reply: str


class ResetResponse(BaseModel):
    message: str


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """
    Recebe uma mensagem do app mobile e retorna a resposta do chatbot.
    Usa o mesmo chat_service do WhatsApp — histórico compartilhado por 'phone'.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Mensagem não pode ser vazia.")

    logger.info(f"[Chat App] Mensagem de '{body.phone}': {body.message[:80]}")

    try:
        resposta = get_chat_response(
            user_id=body.phone,
            user_message=body.message.strip(),
        )
        logger.info(f"[Chat App] Resposta para '{body.phone}': {resposta[:80]}")
        return {"reply": resposta}

    except Exception as e:
        logger.error(f"[Chat App] Erro ao processar mensagem: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao processar sua mensagem. Tente novamente.",
        )


@router.post("/chat/reset", response_model=ResetResponse)
async def reset_chat(phone: str = "app-user"):
    """
    Limpa o histórico de conversa de um usuário específico.
    Útil para o botão 'Nova conversa' no app.
    """
    clear_history(phone)
    logger.info(f"[Chat App] Histórico resetado para '{phone}'")
    return {"message": "Conversa reiniciada com sucesso."}


@router.get("/chat/health", tags=["Health"])
async def chat_health():
    return {"status": "ok", "endpoint": "/chat"}