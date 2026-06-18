import io
import logging
import subprocess
import tempfile
import os

from app.core.config import settings

logger = logging.getLogger(__name__)

# Voz padrão da OpenAI TTS
# Opções: alloy | echo | fable | onyx | nova | shimmer
# - nova: feminina, natural e amigável (recomendada para assistentes)
# - onyx: masculina, profunda e clara
# - shimmer: feminina, suave e expressiva
DEFAULT_VOICE = "nova"


async def _mp3_para_ogg(mp3_bytes: bytes) -> bytes:
    """
    Converte bytes MP3 para OGG/OPUS via ffmpeg.
    OGG/OPUS é o formato nativo de voice note do Telegram.
    Se ffmpeg falhar, retorna o MP3 original como fallback.
    """
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(mp3_bytes)
        mp3_path = f.name

    ogg_path = mp3_path.replace(".mp3", ".ogg")
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", mp3_path,
                "-c:a", "libopus",
                "-b:a", "64k",
                "-vn",
                ogg_path,
            ],
            capture_output=True,
            timeout=30,
        )
        os.unlink(mp3_path)

        if result.returncode != 0:
            logger.error(f"[TTS] ffmpeg falhou: {result.stderr.decode()}")
            if os.path.exists(ogg_path):
                os.unlink(ogg_path)
            return mp3_bytes  # fallback: MP3

        with open(ogg_path, "rb") as f:
            ogg_bytes = f.read()
        os.unlink(ogg_path)
        return ogg_bytes

    except FileNotFoundError:
        logger.warning("[TTS] ffmpeg não encontrado — usando MP3 como fallback.")
        if os.path.exists(mp3_path):
            os.unlink(mp3_path)
        return mp3_bytes
    except Exception as e:
        logger.error(f"[TTS] Erro na conversão ffmpeg: {e}")
        if os.path.exists(mp3_path):
            os.unlink(mp3_path)
        return mp3_bytes


async def _tts_openai(texto: str, voice: str = DEFAULT_VOICE) -> bytes | None:
    """
    Gera áudio usando a API TTS da OpenAI (tts-1).
    Vozes disponíveis: alloy, echo, fable, onyx, nova, shimmer.
    Retorna bytes MP3 ou None se falhar.
    """
    if not getattr(settings, "OPENAI_API_KEY", ""):
        logger.warning("[TTS] OPENAI_API_KEY não configurada.")
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=texto,
            response_format="mp3",
        )
        return response.content
    except Exception as e:
        logger.error(f"[TTS] Erro OpenAI TTS: {e}")
        return None


async def _tts_gtts_fallback(texto: str) -> bytes | None:
    """
    Fallback com gTTS (voz robótica, gratuita).
    Usado apenas se a OpenAI TTS falhar.
    """
    try:
        from gtts import gTTS
        tts = gTTS(text=texto, lang="pt", slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()
    except Exception as e:
        logger.error(f"[TTS] Erro gTTS fallback: {e}")
        return None


async def texto_para_audio_ogg(
    texto: str,
    voice: str = DEFAULT_VOICE,
) -> bytes | None:
    """
    Converte texto em áudio OGG/OPUS pronto para envio como voice note no Telegram.

    Prioridade:
      1. OpenAI TTS (tts-1) — voz natural, qualidade de IA
      2. gTTS — fallback gratuito se a OpenAI falhar
      3. None — se tudo falhar

    O áudio é gerado em MP3 e convertido para OGG/OPUS via ffmpeg.
    """
    # Limita o texto para não exceder o limite da API (4096 chars)
    texto_cortado = texto[:4000] if len(texto) > 4000 else texto

    # 1. Tenta OpenAI TTS
    mp3_bytes = await _tts_openai(texto_cortado, voice=voice)

    # 2. Fallback para gTTS
    if not mp3_bytes:
        logger.info("[TTS] Usando gTTS como fallback.")
        mp3_bytes = await _tts_gtts_fallback(texto_cortado)

    if not mp3_bytes:
        logger.error("[TTS] Todos os métodos de TTS falharam.")
        return None

    # 3. Converte MP3 → OGG/OPUS
    return await _mp3_para_ogg(mp3_bytes)
