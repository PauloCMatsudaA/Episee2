"""
WhatsApp Service — Envio de mensagens via WhatsApp Cloud API (Meta).
"""
import httpx
from app.core.config import get_settings

settings = get_settings()

WHATSAPP_API_URL = (
    f"https://graph.facebook.com/v20.0/{settings.whatsapp_phone_number_id}/messages"
)

HEADERS = {
    "Authorization": f"Bearer {settings.whatsapp_access_token}",
    "Content-Type": "application/json",
}


async def send_text_message(to: str, text: str) -> dict:
    """
    Envia uma mensagem de texto via WhatsApp.

    Args:
        to: Número de destino no formato internacional sem '+' (ex: "5541999999999")
        text: Texto da mensagem

    Returns:
        Resposta da API do Meta
    """
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(WHATSAPP_API_URL, json=payload, headers=HEADERS)
        response.raise_for_status()
        return response.json()


async def send_audio_message(to: str, audio_url: str) -> dict:
    """
    Envia uma mensagem de áudio via WhatsApp (URL pública do arquivo).

    Args:
        to: Número de destino
        audio_url: URL pública do arquivo de áudio MP3

    Returns:
        Resposta da API do Meta
    """
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "audio",
        "audio": {"link": audio_url},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(WHATSAPP_API_URL, json=payload, headers=HEADERS)
        response.raise_for_status()
        return response.json()


async def mark_as_read(message_id: str) -> dict:
    """
    Marca uma mensagem como lida (aparece os dois tiques azuis para o usuário).

    Args:
        message_id: ID da mensagem recebida

    Returns:
        Resposta da API do Meta
    """
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(WHATSAPP_API_URL, json=payload, headers=HEADERS)
        response.raise_for_status()
        return response.json()
