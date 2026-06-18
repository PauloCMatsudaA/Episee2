"""
TTS Service — Converte texto em áudio usando gTTS.

O áudio gerado em MP3 é convertido para OGG/OPUS (formato
nativo do Telegram para mensagens de voz) via ffmpeg.
"""
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
    """
    Converte texto em arquivo de voz OGG/OPUS.

    Args:
        texto: Texto a ser convertido.
        lang: Código de idioma para gTTS. Padrão: "pt" (português).

    Returns:
        Caminho do arquivo .ogg gerado.

    Raises:
        RuntimeError: Se a conversão ou codificação falhar.
    """
    file_id = str(uuid.uuid4())
    mp3_path = AUDIO_DIR / f"{file_id}.mp3"
    ogg_path = AUDIO_DIR / f"{file_id}.ogg"

    # Executa gTTS em thread separada para não bloquear o event loop
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _gerar_mp3, texto, lang, mp3_path)

    # Converte MP3 → OGG/OPUS (formato exigido pelo Telegram para send_voice)
    await loop.run_in_executor(None, _converter_para_ogg, mp3_path, ogg_path)

    # Remove o MP3 intermediário
    mp3_path.unlink(missing_ok=True)

    logger.info(f"TTS gerado: {ogg_path}")
    return ogg_path


def _gerar_mp3(texto: str, lang: str, destino: Path) -> None:
    tts = gTTS(text=texto, lang=lang, slow=False)
    tts.save(str(destino))


def _converter_para_ogg(origem: Path, destino: Path) -> None:
    """
    Usa ffmpeg para converter MP3 em OGG com codec OPUS.
    O Telegram exige OGG/OPUS para exibir como mensagem de voz nativa.
    """
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
    """Remove arquivo de áudio após o envio."""
    try:
        path.unlink(missing_ok=True)
    except Exception as e:
        logger.warning(f"Não foi possível remover áudio temporário {path}: {e}")
