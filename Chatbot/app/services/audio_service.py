"""
Audio Service — Speech-to-Text via Whisper (OpenAI).
Converte áudios do WhatsApp (OGG/OGA) em texto para o chatbot processar.
"""
import httpx
import tempfile
import os
from openai import OpenAI
from app.core.config import get_settings

settings = get_settings()
openai_client = OpenAI(api_key=settings.openai_api_key)


async def download_whatsapp_media(media_id: str) -> bytes:
    """
    Baixa a mídia do WhatsApp usando o media_id retornado pelo webhook.
    Retorna os bytes do arquivo de áudio.
    """
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
    }

    async with httpx.AsyncClient() as client:
        # 1. Obter URL de download
        meta_resp = await client.get(
            f"https://graph.facebook.com/v20.0/{media_id}",
            headers=headers,
        )
        meta_resp.raise_for_status()
        download_url = meta_resp.json()["url"]

        # 2. Baixar o arquivo de áudio
        audio_resp = await client.get(download_url, headers=headers)
        audio_resp.raise_for_status()

    return audio_resp.content


async def transcribe_audio(media_id: str) -> str:
    """
    Baixa o áudio do WhatsApp e transcreve via Whisper.

    Args:
        media_id: ID da mídia retornado pelo webhook do WhatsApp

    Returns:
        Texto transcrito
    """
    audio_bytes = await download_whatsapp_media(media_id)

    # Salva em arquivo temporário (Whisper API precisa de arquivo)
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="pt",  # Força português para maior precisão
            )
        return transcript.text
    finally:
        os.unlink(tmp_path)  # Remove arquivo temporário


async def text_to_speech(text: str) -> bytes:
    """
    Converte texto em áudio via OpenAI TTS (para resposta por voz).

    Args:
        text: Texto a ser convertido

    Returns:
        Bytes do arquivo MP3
    """
    response = openai_client.audio.speech.create(
        model="tts-1",
        voice="nova",   # Voz feminina, clara
        input=text,
        response_format="mp3",
    )
    return response.content
