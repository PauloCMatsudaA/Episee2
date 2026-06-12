"""
Chat Service — Lógica principal do chatbot EPIsee.
Gerencia histórico por usuário, contexto RAG e chamadas ao GPT-4o.
"""
from collections import defaultdict, deque
from openai import OpenAI
from app.core.config import get_settings
from app.rag.retriever import retrieve_relevant_chunks, format_context

settings = get_settings()

# Cliente OpenAI (singleton)
openai_client = OpenAI(api_key=settings.openai_api_key)

# Histórico por número de WhatsApp: { "5541999999999": deque([mensagens]) }
_conversation_history: dict[str, deque] = defaultdict(
    lambda: deque(maxlen=settings.max_history_messages)
)

SYSTEM_PROMPT = """Você é o assistente virtual do EPIsee, um sistema de segurança do trabalho focado em Equipamentos de Proteção Individual (EPIs).

Seu papel é:
1. Orientar trabalhadores sobre o uso correto dos EPIs com base na NR-6
2. Esclarecer dúvidas sobre direitos do trabalhador e obrigações da empresa
3. Informar quais EPIs são necessários para cada tipo de atividade
4. Orientar sobre como solicitar substituição de EPIs danificados
5. Conscientizar sobre a importância do uso correto dos equipamentos

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro, de forma clara e acessível
- Use linguagem simples, evitando jargões técnicos desnecessários
- Quando houver informação da NR-6 no contexto fornecido, baseie sua resposta nela
- Seja objetivo: respostas entre 3-6 parágrafos, salvo quando mais detalhes forem necessários
- Se o trabalhador relatar um risco grave e imediato, oriente-o a parar a atividade e acionar o responsável de segurança
- Nunca invente normas ou legislações que não existem
- Se não souber a resposta, diga que não tem essa informação e sugira consultar o técnico de segurança da empresa ou o site do MTE (gov.br)
- Ao final de respostas sobre EPIs específicos, sempre lembre: "Em caso de dúvida, consulte o técnico de segurança da sua empresa."

Você pode receber perguntas via texto ou transcrições de áudio. Trate ambas da mesma forma."""


def get_chat_response(user_id: str, user_message: str) -> str:
    try:
        relevant_chunks = retrieve_relevant_chunks(
            query=user_message,
            client=openai_client,
            top_k=settings.top_k_chunks,
        )
        rag_context = format_context(relevant_chunks)
    except FileNotFoundError:
        rag_context = ""
    history = _conversation_history[user_id]
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if rag_context:
        messages.append({
            "role": "system",
            "content": (
                "Use as informações abaixo da NR-6 para responder com precisão:\n\n"
                + rag_context
            ),
        })
    messages.extend(list(history))
    messages.append({"role": "user", "content": user_message})
    response = openai_client.chat.completions.create(
        model=settings.gpt_model,
        messages=messages,
        max_tokens=settings.max_tokens_response,
        temperature=0.3,  
    )
    assistant_message = response.choices[0].message.content.strip()
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": assistant_message})

    return assistant_message


def clear_history(user_id: str):
    """Limpa o histórico de conversa de um usuário."""
    if user_id in _conversation_history:
        _conversation_history[user_id].clear()
