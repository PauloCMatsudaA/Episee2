import io
import logging
import subprocess
import tempfile
import os

logger = logging.getLogger(__name__)


async def texto_para_audio_ogg(texto: str, lang: str = "pt") -> bytes | None:
    """
    Converte texto em áudio OGG/OPUS pronto para envio pelo Telegram.

    Fluxo:
      1. gTTS gera um MP3 em memória
      2. ffmpeg converte MP3 → OGG/OPUS (formato nativo do Telegram)

    Retorna os bytes do OGG ou None se falhar.
    Requer ffmpeg instalado no servidor (apt install ffmpeg).
    """
    try:
        from gtts import gTTS  # import lazy — só carrega se gTTS estiver instalado
    except ImportError:
        logger.error("[TTS] gTTS não instalado. Rode: pip install gTTS")
        return None

    try:
        # 1. Gera MP3 em memória
        tts = gTTS(text=texto, lang=lang, slow=False)
        mp3_buffer = io.BytesIO()
        tts.write_to_fp(mp3_buffer)
        mp3_buffer.seek(0)
        mp3_bytes = mp3_buffer.read()

        # 2. Converte MP3 → OGG/OPUS via ffmpeg (necessário para voice note no Telegram)
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as mp3_file:
            mp3_file.write(mp3_bytes)
            mp3_path = mp3_file.name

        ogg_path = mp3_path.replace(".mp3", ".ogg")

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
            # fallback: retorna o MP3 mesmo (Telegram aceita MP3 como audio, não como voice)
            if os.path.exists(ogg_path):
                os.unlink(ogg_path)
            return mp3_bytes  # fallback gracioso

        with open(ogg_path, "rb") as f:
            ogg_bytes = f.read()

        os.unlink(ogg_path)
        return ogg_bytes

    except FileNotFoundError:
        # ffmpeg não está instalado
        logger.warning("[TTS] ffmpeg não encontrado — enviando MP3 como fallback.")
        return mp3_bytes if 'mp3_bytes' in dir() else None
    except Exception as e:
        logger.error(f"[TTS] Erro ao gerar áudio: {e}")
        return None
