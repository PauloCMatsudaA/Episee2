import logging
import secrets
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)
TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"


def _url(method: str) -> str:
    return TELEGRAM_API.format(token=settings.TELEGRAM_BOT_TOKEN, method=method)


async def enviar_alerta_telegram(chat_id: str, mensagem: str) -> bool:
    """Envia uma mensagem de texto para um chat_id via Telegram Bot API."""
    if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(_url("sendMessage"), json={
                "chat_id": chat_id.strip(),
                "text": mensagem,
                "parse_mode": "HTML",
            })
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"[TELEGRAM] Erro ao enviar mensagem: {e}")
        return False


def gerar_link_code() -> str:
    """Gera um código único de 6 caracteres para vinculação do gestor."""
    return "EPIS-" + secrets.token_hex(3).upper()  # ex: EPIS-3FA2C1


async def processar_webhook(update: dict) -> None:
    """
    Processa updates recebidos pelo webhook do Telegram Bot.

    Fluxos suportados:
    1. /vincular CODIGO  — vincula o chat_id ao gestor no banco
    2. Mensagem de texto — envia ao chatbot DeepSeek e responde o usuário
    3. Mensagem de áudio / voice — transcreve e envia ao chatbot DeepSeek
    """
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import select
    # Import lazy para evitar circular import
    from app.services.chatbot_service import responder_chatbot, transcrever_audio_telegram

    message = update.get("message", {})
    if not message:
        return  # ignora outros tipos de update (edited_message, etc.)

    chat_id = str(message.get("chat", {}).get("id", ""))
    first_name = message.get("from", {}).get("first_name", "usuário")
    text = message.get("text", "").strip()

    # ────────────────────────────────────────
    # 1. Comando /vincular — vincula gestor
    # ────────────────────────────────────────
    if text.startswith("/vincular"):
        partes = text.split()
        if len(partes) < 2:
            await enviar_alerta_telegram(chat_id,
                "⚠️ Formato incorreto. Use:\n<code>/vincular SEU_CODIGO</code>"
            )
            return

        codigo = partes[1].strip().upper()
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(User.telegram_link_code == codigo)
            )
            user = result.scalar_one_or_none()

            if not user:
                await enviar_alerta_telegram(chat_id,
                    f"❌ Código <b>{codigo}</b> inválido ou já utilizado.\n"
                    "Gere um novo código no painel EPIsee."
                )
                return

            user.phone = chat_id
            user.telegram_link_code = None
            await db.commit()

        await enviar_alerta_telegram(chat_id,
            f"✅ <b>Vinculado com sucesso, {first_name}!</b>\n\n"
            "Você receberá alertas de não conformidade de EPI por aqui. 🦺\n\n"
            "Você também pode me fazer perguntas sobre EPIs e segurança do trabalho a qualquer momento!"
        )
        logger.info(f"[TELEGRAM] Usuário vinculado — chat_id: {chat_id}")
        return

    # ────────────────────────────────────────
    # 2. Mensagem de áudio / voice note
    # ────────────────────────────────────────
    audio = message.get("voice") or message.get("audio")
    if audio and not text:
        file_id = audio.get("file_id", "")
        await enviar_alerta_telegram(chat_id, "🎤 Transcrevendo seu áudio...")
        transcricao = await transcrever_audio_telegram(file_id)
        if not transcricao:
            await enviar_alerta_telegram(chat_id,
                "❌ Não consegui entender o áudio. Pode digitar sua pergunta?"
            )
            return
        text = transcricao
        await enviar_alerta_telegram(chat_id, f"📝 Entendi: <i>{transcricao}</i>")

    # ────────────────────────────────────────
    # 3. Mensagem de texto → chatbot DeepSeek
    # ────────────────────────────────────────
    if not text:
        await enviar_alerta_telegram(chat_id,
            "👋 Olá! Pode me fazer perguntas sobre EPIs e segurança do trabalho.\n"
            "Para vincular sua conta de gestor use: <code>/vincular SEU_CODIGO</code>"
        )
        return

    # Indicador de digitação enquanto o DeepSeek processa
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            await client.post(_url("sendChatAction"), json={"chat_id": chat_id, "action": "typing"})
    except Exception:
        pass

    resposta = await responder_chatbot(text)
    await enviar_alerta_telegram(chat_id, resposta)
    logger.info(f"[TELEGRAM] Respondido chat_id={chat_id} | pergunta={text[:60]}")
