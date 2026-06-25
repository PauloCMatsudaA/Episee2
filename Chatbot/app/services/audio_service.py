import io
import logging
import httpx
from app.core.config import get_settings
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)
settings = get_settings()
_client = AsyncOpenAI(api_key=settings.openai_api_key)

async def transcribe_audio(media_id: str) -> str:
    
    headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}"}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"https://graph.facebook.com/v19.0/{media_id}",
            headers=headers,
        )
        resp.raise_for_status()
        media_url = resp.json()["url"]

    async with httpx.AsyncClient(timeout=60) as client:
        audio_resp = await client.get(media_url, headers=headers)
        audio_resp.raise_for_status()
        audio_bytes = audio_resp.content

    return await transcribe_audio_from_bytes(audio_bytes, filename="audio.ogg")

async def transcribe_audio_from_bytes(
    audio_bytes: bytes,
    filename: str = "audio.ogg",
) -> str:
    
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcript = await _client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="pt",
    )
    return transcript.text.strip()
