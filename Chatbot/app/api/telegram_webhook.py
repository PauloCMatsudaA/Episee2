"""
Telegram Webhook Router — Recebe e processa mensagens do bot do Telegram.

Fluxo:
  1. Telegram envia POST com Update (mensagem do usuário)
  2. Webhook identifica tipo (texto ou voz)
  3. Se voz: transcreve via Whisper (reutiliza audio_service)
  4. Consulta chatbot (RAG + GPT-4o)
  5. Envia resposta como TEXTO + VOZ (TTS) para o usuário

Configuração necessária (variáveis de ambiente):
  TELEGRAM_BOT_TOKEN  — Token do bot obtido pelo @BotFather
  TELEGRAM_WEBHOOK_URL — URL pública do servidor (ex: https://seuapp.com)
"""
import logging
import os
import httpx
from fastapi import APIRouter, Request, BackgroundTasks
from app.services.chat_service import get_chat_response, clear_history
from app.services.tts_service import texto_para_voz, limpar_audio
from app.services.audio_service import transcribe_audio_from_bytes

logger = logging.getLogger(__name__)
router = APIRouter()

TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"

COMMAND_RESET = "/reiniciar"
COMMAND_HELP = "/ajuda"
COMMAND_VOICE_ON = "/ativar_voz"
COMMAND_VOICE_OFF = "/desativar_voz"

HELP_MESSAGE = (
    "🦺 *EPIsee Chatbot — Telegram*\n\n"
    "Olá! Sou o assistente de segurança do EPIsee.\n\n"
    "Posso te ajudar com:\n"
    "• Informações sobre EPIs (capacetes, luvas, óculos…)\n"
    "• Seus direitos como trabalhador (NR-6)\n"
    "• Obrigações da empresa quanto aos EPIs\n"
    "• Como solicitar substituição de equipamentos\n\n"
    "*Comandos:*\n"
    "• /ajuda — Esta mensagem\n"
    "• /reiniciar — Reinicia a conversa\n"
    "• /ativar_voz — Respostas também em áudio 🔊\n"
    "• /desativar_voz — Somente texto\n"
)

# Armazena preferência de voz por usuário (em memória)
_voice_enabled: dict[str, bool] = {}


def _token() -> str:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN não configurado.")
    return token


async def _send_message(chat_id: int, text: str) -> None:
    url = TELEGRAM_API.format(token=_token(), method="sendMessage")
    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
        })


async def _send_voice(chat_id: int, ogg_path) -> None:
    url = TELEGRAM_API.format(token=_token(), method="sendVoice")
    with open(ogg_path, "rb") as audio_file:
        async with httpx.AsyncClient(timeout=60) as client:
            await client.post(
                url,
                data={"chat_id": chat_id},
                files={"voice": ("voice.ogg", audio_file, "audio/ogg")},
            )


async def _download_file(file_id: str) -> bytes:
    """Baixa um arquivo do Telegram pelo file_id e retorna os bytes."""
    token = _token()
    # 1. Obtém o file_path
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            TELEGRAM_API.format(token=token, method="getFile"),
            params={"file_id": file_id},
        )
        data = resp.json()

    file_path = data["result"]["file_path"]
    file_url = f"https://api.telegram.org/file/bot{token}/{file_path}"

    # 2. Baixa o arquivo
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(file_url)
        return resp.content


# ── Endpoint principal ────────────────────────────────────────────────────────

@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Recebe Updates do Telegram e processa em background.
    Retorna 200 imediatamente.
    """
    body = await request.json()

    message = body.get("message") or body.get("edited_message")
    if not message:
        return {"status": "ignored"}

    background_tasks.add_task(processar_mensagem_telegram, message)
    return {"status": "ok"}


async def processar_mensagem_telegram(message: dict) -> None:
    """
    Processa a mensagem do Telegram e responde com texto + voz (opcional).
    """
    chat_id: int = message["chat"]["id"]
    user_id = str(chat_id)  # Usa chat_id como identificador do histórico
    voice_on = _voice_enabled.get(user_id, True)  # Voz ativada por padrão

    try:
        # ── Comandos especiais ──────────────────────────────────────────────
        text = (message.get("text") or "").strip()

        if text.lower() == COMMAND_RESET:
            clear_history(user_id)
            await _send_message(chat_id, "Conversa reiniciada! Como posso te ajudar com EPIs? 🦺")
            return

        if text.lower() == COMMAND_HELP:
            await _send_message(chat_id, HELP_MESSAGE)
            return

        if text.lower() == COMMAND_VOICE_ON:
            _voice_enabled[user_id] = True
            await _send_message(chat_id, "Voz ativada! Você vai receber respostas em áudio também. 🔊")
            return

        if text.lower() == COMMAND_VOICE_OFF:
            _voice_enabled[user_id] = False
            await _send_message(chat_id, "Voz desativada. Somente respostas em texto.")
            return

        # ── Mensagem de voz do usuário (STT) ───────────────────────────────
        if "voice" in message:
            file_id = message["voice"]["file_id"]
            logger.info(f"Transcrevendo áudio do Telegram para user {user_id}...")
            try:
                audio_bytes = await _download_file(file_id)
                text = await transcribe_audio_from_bytes(audio_bytes)
                logger.info(f"Transcrição: '{text}'")
            except Exception as e:
                logger.error(f"Erro na transcrição: {e}")
                await _send_message(
                    chat_id,
                    "Não consegui entender o áudio. Pode enviar sua dúvida por texto?"
                )
                return

        # ── Tipo não suportado ─────────────────────────────────────────────
        if not text:
            await _send_message(
                chat_id,
                "Por enquanto só processo mensagens de texto e áudio. "
                "Pode me enviar sua dúvida por escrito ou por voz?"
            )
            return

        # ── Obtém resposta do chatbot ──────────────────────────────────────
        logger.info(f"Pergunta do Telegram user {user_id}: '{text}'")
        resposta = get_chat_response(user_id=user_id, user_message=text)

        # ── Envia resposta em texto ────────────────────────────────────────
        await _send_message(chat_id, resposta)

        # ── Envia resposta em voz (TTS) se habilitado ──────────────────────
        if voice_on:
            try:
                ogg_path = await texto_para_voz(resposta)
                await _send_voice(chat_id, ogg_path)
                limpar_audio(ogg_path)
            except Exception as e:
                logger.warning(f"TTS falhou (não crítico): {e}")
                # Não bloqueia — a resposta em texto já foi enviada

        logger.info(f"Resposta enviada ao Telegram user {user_id}.")

    except Exception as e:
        logger.error(f"Erro ao processar mensagem Telegram user {user_id}: {e}", exc_info=True)
        try:
            await _send_message(chat_id, "Ocorreu um erro interno. Tente novamente em alguns instantes.")
        except Exception:
            pass
