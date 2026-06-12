import logging
import os
import tempfile

import httpx
from openai import AsyncOpenAI
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.training_video import EpiType, TrainingVideo

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# DeepSeek — API 100% compatível com OpenAI SDK
# ──────────────────────────────────────────────
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

deepseek_client = AsyncOpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com/v1",
)

SYSTEM_PROMPT = """
Você é o EPIsee Bot, um assistente especializado em segurança do trabalho e EPIs (Equipamentos de Proteção Individual).

Você ajuda trabalhadores a:
- Saber quais EPIs são obrigatórios para cada função/setor
- Entender a NR-6 (Norma Regulamentadora nº 6)
- Conhecer seus direitos trabalhistas em relação aos EPIs
- Verificar se a empresa está cumprindo suas obrigações legais
- Solicitar substituição de EPIs danificados
- Entender como usar corretamente cada equipamento
- Receber indicações de vídeos educativos sobre o uso correto de EPIs

Regras:
- Responda sempre em português do Brasil
- Seja direto e objetivo
- Use linguagem simples, acessível ao trabalhador
- Nunca invente normas, baseie-se apenas na NR-6 e CLT
- Se não souber algo, diga claramente que não tem essa informação
- Quando o trabalhador perguntar sobre um EPI específico, inclua as ocasiões de uso, como usar corretamente e erros comuns
- Suas respostas serão enviadas via Telegram; evite markdown pesado, prefira texto limpo com emojis quando útil
"""


async def transcrever_audio_telegram(file_id: str) -> str:
    """
    Baixa um áudio enviado pelo usuário no Telegram e transcreve via
    DeepSeek (endpoint compatível com Whisper da OpenAI).
    """
    try:
        telegram_api = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

        async with httpx.AsyncClient(timeout=30) as client:
            # 1. Obtém o caminho do arquivo no Telegram
            r = await client.get(f"{telegram_api}/getFile", params={"file_id": file_id})
            r.raise_for_status()
            file_path = r.json()["result"]["file_path"]

            # 2. Baixa o arquivo
            download_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
            audio_resp = await client.get(download_url)
            audio_resp.raise_for_status()

        suffix = "." + file_path.split(".")[-1] if "." in file_path else ".ogg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_resp.content)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            transcricao = await deepseek_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="pt",
            )

        os.unlink(tmp_path)
        return transcricao.text

    except Exception as e:
        logger.error(f"[CHATBOT] Erro ao transcrever áudio Telegram: {e}")
        return ""


async def _buscar_contexto_epi(mensagem: str) -> str:
    """Busca no banco EPIs cujo nome aparece na mensagem e monta contexto extra."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(EpiType))
            epis = result.scalars().all()

        contexto_parts = []
        mensagem_lower = mensagem.lower()

        for epi in epis:
            if epi.nome.lower() in mensagem_lower:
                parte = f"\n---\nEPI: {epi.nome}"
                if epi.quando_usar:
                    parte += f"\nQuando usar: {epi.quando_usar}"
                if epi.como_usar:
                    parte += f"\nComo usar corretamente: {epi.como_usar}"
                if epi.erros_comuns:
                    parte += f"\nErros comuns: {epi.erros_comuns}"
                if epi.nr6_ref:
                    parte += f"\nReferência NR-6: {epi.nr6_ref}"

                videos_aprovados = [v for v in epi.videos if v.aprovado]
                if videos_aprovados:
                    parte += "\nVídeos recomendados:"
                    for v in sorted(videos_aprovados, key=lambda x: -x.prioridade)[:3]:
                        fonte = f" ({v.fonte})" if v.fonte else ""
                        parte += f"\n  - {v.titulo}{fonte}: {v.url}"

                contexto_parts.append(parte)

        return "\n".join(contexto_parts)
    except Exception as e:
        logger.warning(f"[CHATBOT] Falha ao buscar contexto EPI: {e}")
        return ""


async def responder_chatbot(mensagem: str) -> str:
    """Recebe uma mensagem de texto e retorna a resposta do DeepSeek."""
    try:
        contexto_db = await _buscar_contexto_epi(mensagem)

        system_content = SYSTEM_PROMPT
        if contexto_db:
            system_content += (
                "\n\nInformações da base de dados da empresa sobre os EPIs mencionados "
                "(use estas informações prioritariamente):\n" + contexto_db
            )

        response = await deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user",   "content": mensagem},
            ],
            max_tokens=600,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"[CHATBOT] Erro DeepSeek: {e}")
        return "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em instantes."
