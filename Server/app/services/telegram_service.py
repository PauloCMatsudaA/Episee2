import logging
import secrets
import httpx
from sqlalchemy import select
from app.core.config import settings

logger = logging.getLogger(__name__)
TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"


def _url(method: str) -> str:
    return TELEGRAM_API.format(token=settings.TELEGRAM_BOT_TOKEN, method=method)


async def enviar_alerta_telegram(chat_id: str, mensagem: str) -> bool:
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
        logger.error(f"[TELEGRAM] Erro: {e}")
        return False


def gerar_link_code() -> str:
    """Gera um código único de 6 caracteres para vinculação."""
    return "EPIS-" + secrets.token_hex(3).upper()  # ex: EPIS-3FA2C1


async def processar_webhook(update: dict) -> None:
    """
    Chamado pelo endpoint /telegram/webhook quando o bot recebe mensagem.
    Processa o comando /vincular CODIGO e salva o chat_id do gestor.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.user import User

    message = update.get("message", {})
    text = message.get("text", "").strip()
    chat_id = str(message.get("from", {}).get("id", ""))
    first_name = message.get("from", {}).get("first_name", "usuário")

    if not text.startswith("/vincular"):
        await enviar_alerta_telegram(chat_id,
            "👋 Olá! Para vincular sua conta EPIsee, use:\n\n"
            "<code>/vincular SEU_CODIGO</code>\n\n"
            "O código está disponível no painel do sistema."
        )
        return

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

        # Salva o chat_id e limpa o código (uso único)
        user.phone = chat_id
        user.telegram_link_code = None
        await db.commit()

        await enviar_alerta_telegram(chat_id,
            f"✅ <b>Vinculado com sucesso, {first_name}!</b>\n\n"
            "Você receberá alertas de não conformidade de EPI por aqui. 🦺"
        )
        logger.info(f"[TELEGRAM] Gestor {user.id} ({user.name}) vinculado — chat_id: {chat_id}")