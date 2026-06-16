import logging
import os
import re
import tempfile

import httpx
from openai import AsyncOpenAI
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.training_video import EpiType

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN


def _get_deepseek_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com/v1",
    )


SYSTEM_PROMPT = """
Você é o EPIsee Bot, um assistente especializado em segurança do trabalho e EPIs
(Equipamentos de Proteção Individual).

Você ajuda trabalhadores a:
- Saber quais EPIs são obrigatórios para cada função/setor
- Entender a NR-6 (Norma Regulamentadora nº 6)
- Conhecer seus direitos trabalhistas em relação aos EPIs
- Verificar se a empresa está cumprindo suas obrigações legais
- Solicitar substituição de EPIs danificados
- Entender como usar corretamente cada equipamento
- Receber indicações de vídeos educativos sobre o uso correto de EPIs

Regras de formato (OBRIGATÓRIAS):
- Responda em texto puro, sem markdown
- NUNCA use asteriscos (**), cerquilhas (#), underlines (_) ou qualquer formatação markdown
- Use listas numeradas simples (1. 2. 3.) quando precisar listar itens
- Não comece a resposta com "Olá" ou cumprimentos — vá direto ao ponto
- Use emojis com moderacão apenas quando ajudar a clareza
- Mantenha respostas objetivas e concisas

Regras de conteúdo:
- Responda sempre em português do Brasil
- Use linguagem simples, acessível ao trabalhador
- Nunca invente normas, baseie-se apenas na NR-6 e CLT
- Se não souber algo, diga claramente que não tem essa informação
- Quando o trabalhador perguntar sobre um EPI específico, inclua as ocasiões
  de uso, como usar corretamente e erros comuns
"""


def _limpar_markdown(texto: str) -> str:
    """Remove markdown residual da resposta do modelo."""
    # Remove **negrito** e *italico*
    texto = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', texto)
    # Remove __negrito__ e _italico_
    texto = re.sub(r'_{1,2}(.*?)_{1,2}', r'\1', texto)
    # Remove # cabecalhos
    texto = re.sub(r'^#{1,6}\s+', '', texto, flags=re.MULTILINE)
    # Remove linhas separadoras ---
    texto = re.sub(r'^[-*_]{3,}\s*$', '', texto, flags=re.MULTILINE)
    # Remove saudacoes no inicio (Ola!, Olá!, Oi!)
    texto = re.sub(r'^(olá[!,.]?|ola[!,.]?|oi[!,.]?)\s*', '', texto, flags=re.IGNORECASE)
    # Remove linhas em branco duplas
    texto = re.sub(r'\n{3,}', '\n\n', texto)
    return texto.strip()


async def _colunas_epi_types() -> set:
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("PRAGMA table_info(epi_types)"))
            return {row[1] for row in result.fetchall()}
    except Exception:
        return set()


def _epi_relevante(epi: EpiType, mensagem_lower: str, tem_palavras_chave: bool) -> bool:
    if epi.nome.lower() in mensagem_lower:
        return True
    if tem_palavras_chave and getattr(epi, 'palavras_chave', None):
        termos = [t.strip().lower() for t in epi.palavras_chave.split(",") if t.strip()]
        if any(termo in mensagem_lower for termo in termos):
            return True
    return False


async def _buscar_contexto_epi(mensagem: str) -> str:
    try:
        colunas = await _colunas_epi_types()
        tem_palavras_chave = "palavras_chave" in colunas

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(EpiType).options(selectinload(EpiType.videos))
            )
            epis = result.scalars().all()

            mensagem_lower = mensagem.lower()
            contexto_parts = []

            for epi in epis:
                if not _epi_relevante(epi, mensagem_lower, tem_palavras_chave):
                    continue

                parte = f"\n---\nEPI: {epi.nome}"

                if tem_palavras_chave and getattr(epi, 'palavras_chave', None):
                    parte += f"\nTambém conhecido como: {epi.palavras_chave}"
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


async def transcrever_audio_telegram(file_id: str) -> str:
    try:
        telegram_api = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(f"{telegram_api}/getFile", params={"file_id": file_id})
            r.raise_for_status()
            file_path = r.json()["result"]["file_path"]
            download_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
            audio_resp = await client.get(download_url)
            audio_resp.raise_for_status()

        suffix = "." + file_path.split(".")[-1] if "." in file_path else ".ogg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_resp.content)
            tmp_path = tmp.name

        client_ds = _get_deepseek_client()
        with open(tmp_path, "rb") as audio_file:
            transcricao = await client_ds.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="pt",
            )
        os.unlink(tmp_path)
        return transcricao.text

    except Exception as e:
        logger.error(f"[CHATBOT] Erro ao transcrever áudio Telegram: {e}")
        return ""


async def responder_chatbot(mensagem: str) -> str:
    try:
        contexto_db = await _buscar_contexto_epi(mensagem)

        system_content = SYSTEM_PROMPT
        if contexto_db:
            system_content += (
                "\n\nInformações da base de dados da empresa sobre os EPIs "
                "mencionados (use estas informações prioritariamente):\n"
                + contexto_db
            )

        client_ds = _get_deepseek_client()
        response = await client_ds.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user",   "content": mensagem},
            ],
            max_tokens=600,
            temperature=0.3,
        )
        texto = response.choices[0].message.content.strip()
        return _limpar_markdown(texto)

    except Exception as e:
        logger.error(f"[CHATBOT] Erro DeepSeek: {e}")
        return (
            "Desculpe, ocorreu um erro ao processar sua mensagem. "
            "Tente novamente em instantes."
        )
