import logging
import os
import re
import tempfile
from typing import List, Optional

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
Voc\u00ea \u00e9 o EPIsee Bot, assistente especializado em seguran\u00e7a do trabalho e EPIs.

Voc\u00ea ajuda trabalhadores a:
- Saber quais EPIs s\u00e3o obrigat\u00f3rios para cada fun\u00e7\u00e3o/setor
- Entender a NR-6 (Norma Regulamentadora n\u00ba 6)
- Conhecer seus direitos trabalhistas em rela\u00e7\u00e3o aos EPIs
- Verificar se a empresa est\u00e1 cumprindo suas obriga\u00e7\u00f5es legais
- Solicitar substitui\u00e7\u00e3o de EPIs danificados
- Entender como usar corretamente cada equipamento
- Receber indica\u00e7\u00f5es de v\u00eddeos educativos sobre o uso correto de EPIs

Regras de FORMATO (OBRIGAT\u00d3RIAS):
- Responda em texto puro, sem markdown
- NUNCA use asteriscos (**), cerquilhas (#), underlines (_) ou qualquer formata\u00e7\u00e3o markdown
- Use listas numeradas simples (1. 2. 3.) ou h\u00edfen simples (-) quando precisar listar
- N\u00e3o comece com "Ol\u00e1" ou cumprimentos — v\u00e1 direto ao ponto
- Respostas objetivas e concisas

Regras de CONTE\u00daDO:
- Responda sempre em portugu\u00eas do Brasil
- Use linguagem simples, acess\u00edvel ao trabalhador
- Nunca invente normas — baseie-se apenas na NR-6 e CLT
- Se n\u00e3o souber algo, diga claramente
- Ao citar EPIs, mencione o nome completo do equipamento
- Ao recomendar EPIs, inclua exemplos de modelos/marcas conhecidos no Brasil quando poss\u00edvel
  (exemplos: capacete 3M H-700, luva de raspa Volk, \u00f3culos Carbografite, protetor auditivo 3M 1100,
   bota de seguran\u00e7a Bracol, m\u00e1scara PFF2 3M 9820, avental de raspa Fujiwara)
- Quando perguntar sobre um EPI espec\u00edfico: inclua quando usar, como usar corretamente e erros comuns
- Leve em conta o contexto e as mensagens anteriores da conversa para dar respostas coerentes
"""


def _limpar_markdown(texto: str) -> str:
    texto = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', texto)
    texto = re.sub(r'_{1,2}(.*?)_{1,2}', r'\1', texto)
    texto = re.sub(r'^#{1,6}\s+', '', texto, flags=re.MULTILINE)
    texto = re.sub(r'^[-*_]{3,}\s*$', '', texto, flags=re.MULTILINE)
    texto = re.sub(r'^(ol\u00e1[!,.]?|ola[!,.]?|oi[!,.]?)\s*', '', texto, flags=re.IGNORECASE)
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
                    parte += f"\nTamb\u00e9m conhecido como: {epi.palavras_chave}"
                if epi.quando_usar:
                    parte += f"\nQuando usar: {epi.quando_usar}"
                if epi.como_usar:
                    parte += f"\nComo usar corretamente: {epi.como_usar}"
                if epi.erros_comuns:
                    parte += f"\nErros comuns: {epi.erros_comuns}"
                if epi.nr6_ref:
                    parte += f"\nRefer\u00eancia NR-6: {epi.nr6_ref}"

                videos_aprovados = [v for v in epi.videos if v.aprovado]
                if videos_aprovados:
                    parte += "\nV\u00eddeos recomendados:"
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
        logger.error(f"[CHATBOT] Erro ao transcrever \u00e1udio Telegram: {e}")
        return ""


async def responder_chatbot(
    mensagem: str,
    nome_usuario: Optional[str] = None,
    setor_usuario: Optional[str] = None,
    historico: Optional[List[dict]] = None,
) -> str:
    try:
        contexto_db = await _buscar_contexto_epi(mensagem)

        system_content = SYSTEM_PROMPT

        # Contexto do usuario logado
        if nome_usuario or setor_usuario:
            system_content += "\n\nContexto do usu\u00e1rio atual:"
            if nome_usuario:
                system_content += f"\n- Nome: {nome_usuario}"
            if setor_usuario:
                system_content += (
                    f"\n- Setor: {setor_usuario}"
                    f"\n- Ao citar EPIs obrigat\u00f3rios, priorize os do setor '{setor_usuario}'."
                )

        # Contexto da base de dados
        if contexto_db:
            system_content += (
                "\n\nInforma\u00e7\u00f5es do banco de dados sobre EPIs mencionados "
                "(use prioritariamente):\n" + contexto_db
            )

        # Monta as mensagens: system + historico + mensagem atual
        messages = [{"role": "system", "content": system_content}]

        if historico:
            for msg in historico[-10:]:  # limita a 10 mensagens anteriores
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": mensagem})

        client_ds = _get_deepseek_client()
        response = await client_ds.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=700,
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
