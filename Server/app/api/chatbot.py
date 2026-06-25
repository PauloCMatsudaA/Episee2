import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from twilio.twiml.messaging_response import MessagingResponse

from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.sector import Sector
from app.services.chatbot_service import responder_chatbot, transcrever_audio_telegram

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

class MensagemHistorico(BaseModel):
    role: str    
    content: str

class ChatbotRequest(BaseModel):
    mensagem: str
    historico: Optional[List[MensagemHistorico]] = []

@router.post("/whatsapp")
async def webhook_whatsapp(
    request: Request,
    Body: str = Form(default=""),
    NumMedia: int = Form(default=0),
    MediaUrl0: str = Form(default=""),
    MediaContentType0: str = Form(default=""),
    From: str = Form(default=""),
):
    logger.info(f"[WHATSAPP] Mensagem de {From} | m\u00eddia={NumMedia}")

    texto_usuario = Body.strip()

    if NumMedia > 0 and "audio" in MediaContentType0:
        transcrito = await transcrever_audio_telegram(MediaUrl0)
        texto_usuario = transcrito if transcrito else "N\u00e3o consegui entender o \u00e1udio. Pode repetir por texto?"

    if not texto_usuario:
        texto_usuario = "Ol\u00e1"

    resposta = await responder_chatbot(texto_usuario)
    twiml = MessagingResponse()
    twiml.message(resposta)
    return Response(content=str(twiml), media_type="application/xml")

@router.post("/texto")
async def chatbot_texto(
    body: ChatbotRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.mensagem.strip():
        return {"erro": "Mensagem vazia"}

    nome_setor = None
    if current_user.sector_id:
        result = await db.execute(select(Sector).where(Sector.id == current_user.sector_id))
        setor = result.scalar_one_or_none()
        if setor:
            nome_setor = setor.name

    historico = [h.model_dump() for h in (body.historico or [])]

    resposta = await responder_chatbot(
        body.mensagem.strip(),
        nome_usuario=current_user.name,
        setor_usuario=nome_setor,
        historico=historico,
    )
    return {"resposta": resposta}
