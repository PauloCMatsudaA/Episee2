"""
Webhook Router — Recebe e processa eventos do WhatsApp Cloud API.

Fluxo:
  1. Meta envia POST com mensagem do usuário
  2. Webhook identifica tipo (texto ou áudio)
  3. Se áudio: transcreve via Whisper
  4. Consulta chatbot (RAG + GPT-4o)
  5. Envia resposta de volta ao usuário via WhatsApp
"""
import logging
from fastapi import APIRouter, Request, Response, HTTPException, BackgroundTasks
from app.core.config import get_settings
from app.services.chat_service import get_chat_response, clear_history
from app.services.whatsapp_service import send_text_message, mark_as_read
from app.services.audio_service import transcribe_audio

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

# Comandos especiais que o usuário pode enviar
COMMAND_RESET = "/reiniciar"
COMMAND_HELP = "/ajuda"

HELP_MESSAGE = """*EPIsee Chatbot — Ajuda* 

Olá! Sou o assistente de segurança do trabalho do EPIsee.

Posso te ajudar com:
• Informações sobre EPIs (capacetes, luvas, óculos, etc.)
• Seus direitos como trabalhador (NR-6)
• Obrigações da empresa quanto aos EPIs
• Como solicitar substituição de equipamentos danificados
• Penalidades para empresas que descumprem as normas

*Comandos disponíveis:*
• /ajuda — Mostra esta mensagem
• /reiniciar — Reinicia a conversa

Pode me enviar sua pergunta por *texto*! """


@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Verificação do webhook pela Meta.
    A Meta envia um GET com hub.challenge que precisa ser retornado.
    """
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        logger.info("Webhook verificado com sucesso pela Meta.")
        return Response(content=challenge, media_type="text/plain")

    logger.warning(f"Falha na verificação do webhook. Token recebido: {token}")
    raise HTTPException(status_code=403, detail="Token de verificação inválido.")


@router.post("/webhook")
async def receive_message(request: Request, background_tasks: BackgroundTasks):
    """
    Recebe mensagens do WhatsApp e processa em background.
    Retorna 200 imediatamente para evitar timeout da Meta.
    """
    body = await request.json()

    # Valida estrutura mínima esperada
    try:
        entry = body["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]
    except (KeyError, IndexError):
        # Pode ser notificação de status de entrega — ignora
        return {"status": "ignored"}

    # Verifica se é uma mensagem real (não status)
    if "messages" not in value:
        return {"status": "ignored"}

    message = value["messages"][0]
    from_number = message["from"]
    message_id = message["id"]
    message_type = message["type"]

    # Processa em background (Meta exige resposta em < 5s)
    background_tasks.add_task(
        process_message,
        from_number=from_number,
        message_id=message_id,
        message_type=message_type,
        message=message,
    )

    return {"status": "ok"}


async def process_message(
    from_number: str,
    message_id: str,
    message_type: str,
    message: dict,
):
    """
    Processa a mensagem recebida e envia a resposta.
    Executado em background.
    """
    try:
        # Marca como lida
        await mark_as_read(message_id)

        # Comandos especiais
        if message_type == "text":
            user_text = message["text"]["body"].strip()

            if user_text.lower() == COMMAND_RESET:
                clear_history(from_number)
                await send_text_message(
                    from_number,
                    "Conversa reiniciada! Como posso te ajudar com EPIs? 🦺"
                )
                return

            if user_text.lower() == COMMAND_HELP:
                await send_text_message(from_number, HELP_MESSAGE)
                return

        # Áudio: transcrever primeiro
        elif message_type == "audio":
            media_id = message["audio"]["id"]
            logger.info(f"Transcrevendo áudio de {from_number}...")
            try:
                user_text = await transcribe_audio(media_id)
                logger.info(f"Transcrição: '{user_text}'")
            except Exception as e:
                logger.error(f"Erro na transcrição: {e}")
                await send_text_message(
                    from_number,
                    "Não consegui entender o áudio. Pode tentar enviar sua dúvida por texto?"
                )
                return

        else:
            # Tipo não suportado (imagem, vídeo, documento, etc.)
            await send_text_message(
                from_number,
                "Por enquanto só consigo processar mensagens de texto e áudio. "
                "Pode me enviar sua dúvida por escrito ou por voz?"
            )
            return

        # Obter resposta do chatbot
        logger.info(f"Processando pergunta de {from_number}: '{user_text}'")
        response_text = get_chat_response(user_id=from_number, user_message=user_text)

        # Enviar resposta
        await send_text_message(from_number, response_text)
        logger.info(f"Resposta enviada para {from_number}.")

    except Exception as e:
        logger.error(f"Erro ao processar mensagem de {from_number}: {e}", exc_info=True)
        try:
            await send_text_message(
                from_number,
                "Ocorreu um erro interno. Por favor, tente novamente em alguns instantes."
            )
        except Exception:
            pass
