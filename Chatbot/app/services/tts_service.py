import asyncio
import logging
import os
import subprocess
import uuid
from pathlib import Path

from gtts import gTTS

logger = logging.getLogger(__name__)

AUDIO_DIR = Path("audio_temp")
AUDIO_DIR.mkdir(exist_ok=True)

async def texto_para_voz(texto: str, lang: str = "pt") -> Path:
    
    file_id = str(uuid.uuid4())
    mp3_path = AUDIO_DIR / f"{file_id}.mp3"
    ogg_path = AUDIO_DIR / f"{file_id}.ogg"

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _gerar_mp3, texto, lang, mp3_path)

    await loop.run_in_executor(None, _converter_para_ogg, mp3_path, ogg_path)

    mp3_path.unlink(missing_ok=True)

    logger.info(f"TTS gerado: {ogg_path}")
    return ogg_path

def _gerar_mp3(texto: str, lang: str, destino: Path) -> None:
    tts = gTTS(text=texto, lang=lang, slow=False)
    tts.save(str(destino))

def _converter_para_ogg(origem: Path, destino: Path) -> None:
    
    resultado = subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(origem),
            "-c:a", "libopus",
            "-f", "ogg",
            str(destino),
        ],
        capture_output=True,
        text=True,
    )
    if resultado.returncode != 0:
        raise RuntimeError(
            f"ffmpeg falhou ao converter para OGG: {resultado.stderr}"
        )

def limpar_audio(path: Path) -> None:
    
    try:
        path.unlink(missing_ok=True)
    except Exception as e:
        logger.warning(f"Não foi possível remover áudio temporário {path}: {e}")
