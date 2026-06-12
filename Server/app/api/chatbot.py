import logging
from fastapi import APIRouter, Form, Request
from fastapi.responses import Response
from twilio.twiml.messaging_response import MessagingResponse
from app.services.chatbot_service import responder_chatbot, transcrever_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/whatsapp")
async def webhook_whatsapp(
    request: Request,
    Body: str = Form(default=""),
    NumMedia: int = Form(default=0),
    MediaUrl0: str = Form(default=""),
    MediaContentType0: str = Form(default=""),
    From: str = Form(default=""),
):
    logger.info(f"[WHATSAPP] Mensagem de {From} | mídia={NumMedia}")

    texto_usuario = Body.strip()

    if NumMedia > 0 and "audio" in MediaContentType0:
        logger.info(f"[WHATSAPP] Áudio recebido → transcrevendo...")
        transcrito = await transcrever_audio(MediaUrl0)
        if transcrito:
            texto_usuario = transcrito
            logger.info(f"[WHATSAPP] Transcrição: {transcrito}")
        else:
            texto_usuario = "Não consegui entender o áudio. Pode repetir por texto?"

    if not texto_usuario:
        texto_usuario = "Olá"

    resposta = await responder_chatbot(texto_usuario)

    twiml = MessagingResponse()
    twiml.message(resposta)

    return Response(content=str(twiml), media_type="application/xml")


@router.post("/texto")
async def chatbot_texto(request: Request):
    body = await request.json()
    mensagem = body.get("mensagem", "").strip()
    if not mensagem:
        return {"erro": "Mensagem vazia"}
    resposta = await responder_chatbot(mensagem)
    return {"resposta": resposta}