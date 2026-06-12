import logging
import os
import tempfile

import httpx
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.training_video import EpiType, TrainingVideo

logger = logging.getLogger(__name__)

OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN", "")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

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
"""


async def transcrever_audio(audio_url: str) -> str:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                audio_url,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                timeout=30,
            )
            resp.raise_for_status()

        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
            tmp.write(resp.content)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            transcricao = await openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="pt",
            )

        os.unlink(tmp_path)
        return transcricao.text

    except Exception as e:
        logger.error(f"[CHATBOT] Erro ao transcrever áudio: {e}")
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

                # Vídeos aprovados
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
    try:
        contexto_db = await _buscar_contexto_epi(mensagem)

        system_content = SYSTEM_PROMPT
        if contexto_db:
            system_content += (
                "\n\nInformações da base de dados da empresa sobre os EPIs mencionados "
                "(use estas informações prioritariamente):\n" + contexto_db
            )

        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user",   "content": mensagem},
            ],
            max_tokens=600,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"[CHATBOT] Erro: {e}")
        return "Desculpe, ocorreu um erro. Por favor, tente novamente em alguns instantes."
