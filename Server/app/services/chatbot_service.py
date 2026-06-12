import os
import logging
import httpx
import tempfile
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
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

Regras:
- Responda sempre em português do Brasil
- Seja direto e objetivo
- Use linguagem simples, acessível ao trabalhador
- Nunca invente normas, baseie-se apenas na NR-6 e CLT
- Se não souber algo, diga claramente que não tem essa informação
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


async def responder_chatbot(mensagem: str) -> str:
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": mensagem},
            ],
            max_tokens=500,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"[CHATBOT] Erro: {e}")
        return "Desculpe, ocorreu um erro. Por favor, tente novamente em alguns instantes."