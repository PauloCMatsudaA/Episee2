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


async def enviar_audio_telegram(chat_id: str, audio_bytes: bytes, is_ogg: bool = True) -> bool:
    """
    Envia um arquivo de áudio como voice note (OGG/OPUS) ou audio (MP3).
    OGG/OPUS aparece como bolha de voz no Telegram; MP3 aparece como arquivo de áudio.
    """
    if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
        return False
    try:
        method = "sendVoice" if is_ogg else "sendAudio"
        field = "voice" if is_ogg else "audio"
        filename = "resposta.ogg" if is_ogg else "resposta.mp3"
        mime = "audio/ogg" if is_ogg else "audio/mpeg"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                _url(method),
                data={"chat_id": chat_id.strip()},
                files={field: (filename, audio_bytes, mime)},
            )
            if resp.status_code != 200:
                logger.error(f"[TELEGRAM] Erro ao enviar áudio: {resp.text}")
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"[TELEGRAM] Erro ao enviar áudio: {e}")
        return False


def gerar_link_code() -> str:
    """Gera um código único de 6 caracteres para vinculação do gestor."""
    return "EPIS-" + secrets.token_hex(3).upper()  # ex: EPIS-3FA2C1


async def processar_webhook(update: dict) -> None:
    """
    Processa updates recebidos pelo webhook do Telegram Bot.

    Fluxos suportados:
    1. /vincular CODIGO  — vincula o chat_id ao gestor no banco
    2. /voz_on | /voz_off — ativa/desativa resposta em áudio (TTS)
    3. Mensagem de texto — envia ao chatbot DeepSeek e responde com texto + voz (se ativo)
    4. Mensagem de áudio / voice — transcreve e envia ao chatbot DeepSeek
    """
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import select
    from app.services.chatbot_service import responder_chatbot, transcrever_audio_telegram
    from app.services.tts_service import texto_para_audio_ogg

    message = update.get("message", {})
    if not message:
        return

    chat_id = str(message.get("chat", {}).get("id", ""))
    first_name = message.get("from", {}).get("first_name", "usuário")
    text = message.get("text", "").strip()

    # ────────────────────────────────────────
    # Controle de TTS por sessão (em memória)
    # ────────────────────────────────────────
    if not hasattr(processar_webhook, "_voz_ativa"):
        processar_webhook._voz_ativa = {}  # type: ignore[attr-defined]

    voz_ativa: dict = processar_webhook._voz_ativa  # type: ignore[attr-defined]

    # ────────────────────────────────────────
    # 1. Comando /vincular
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
            "Pode me fazer perguntas sobre EPIs a qualquer momento!\n"
            "Use /voz_on para ativar respostas em áudio e /voz_off para desativar."
        )
        logger.info(f"[TELEGRAM] Usuário vinculado — chat_id: {chat_id}")
        return

    # ────────────────────────────────────────
    # 2. Comandos de controle de voz
    # ────────────────────────────────────────
    if text == "/voz_on":
        voz_ativa[chat_id] = True
        await enviar_alerta_telegram(chat_id,
            "🔊 Respostas em áudio <b>ativadas</b>!\n"
            "A partir de agora vou responder com voz + texto.\n"
            "Use /voz_off para desativar."
        )
        return

    if text == "/voz_off":
        voz_ativa[chat_id] = False
        await enviar_alerta_telegram(chat_id,
            "🔇 Respostas em áudio <b>desativadas</b>.\n"
            "Use /voz_on para reativar."
        )
        return

    if text in ("/start", "/ajuda", "/help"):
        await enviar_alerta_telegram(chat_id,
            "👷 <b>EPIsee Bot</b>\n\n"
            "Comandos disponíveis:\n"
            "/vincular CODIGO — vincula sua conta de gestor\n"
            "/voz_on — ativa respostas em áudio (TTS)\n"
            "/voz_off — desativa respostas em áudio\n"
            "/ajuda — exibe esta mensagem\n\n"
            "Pode me fazer perguntas sobre EPIs e segurança do trabalho a qualquer momento! 🦺"
        )
        return

    # ────────────────────────────────────────
    # 3. Mensagem de áudio / voice note
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
    # 4. Sem texto — mensagem de boas-vindas
    # ────────────────────────────────────────
    if not text:
        await enviar_alerta_telegram(chat_id,
            "👋 Olá! Pode me fazer perguntas sobre EPIs e segurança do trabalho.\n"
            "Para vincular sua conta use: <code>/vincular SEU_CODIGO</code>\n"
            "Para respostas em áudio use: /voz_on"
        )
        return

    # ────────────────────────────────────────
    # 5. Texto → chatbot DeepSeek
    # ────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            await client.post(_url("sendChatAction"), json={"chat_id": chat_id, "action": "typing"})
    except Exception:
        pass

    resposta = await responder_chatbot(text)

    # Sempre envia texto
    await enviar_alerta_telegram(chat_id, resposta)

    # Se TTS ativo para este chat, envia também o áudio
    if voz_ativa.get(chat_id, False):
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                await client.post(_url("sendChatAction"), json={"chat_id": chat_id, "action": "record_voice"})
        except Exception:
            pass

        audio_bytes = await texto_para_audio_ogg(resposta)
        if audio_bytes:
            # Detecta se é OGG (bytes iniciam com OggS) ou MP3 (fallback)
            is_ogg = audio_bytes[:4] == b"OggS"
            await enviar_audio_telegram(chat_id, audio_bytes, is_ogg=is_ogg)
        else:
            logger.warning(f"[TELEGRAM] TTS falhou para chat_id={chat_id}")

    logger.info(f"[TELEGRAM] Respondido chat_id={chat_id} | pergunta={text[:60]}")
