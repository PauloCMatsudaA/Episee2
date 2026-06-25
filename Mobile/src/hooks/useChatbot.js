import { useState, useCallback, useRef } from 'react';
import { chatbotApi } from '../api/api';

const WELCOME_MESSAGE = {
  id: '0',
  role: 'bot',
  text: 'Sou o assistente EPIsee. Posso ajudar com dúvidas sobre EPIs e segurança do trabalho. O que você precisa saber?',
  timestamp: new Date(),
};

const QUICK_QUESTIONS = [
  'Quais EPIs são obrigatórios para o meu setor?',
  'Como solicitar um EPI novo?',
  'O que diz a NR-6?',
  'Prazo de vida útil do capacete',
];

export function useChatbot() {
  const [messages, setMessages]   = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);
  const messageCounter            = useRef(1);

  function buildUserMessage(text) {
    const id = String(messageCounter.current++);
    return { id, role: 'user', text, timestamp: new Date() };
  }

  function buildBotMessage(text) {
    const id = String(messageCounter.current++);
    return { id, role: 'bot', text, timestamp: new Date() };
  }

  function buildErrorMessage() {
    return buildBotMessage('Desculpe, não consegui processar sua mensagem. Verifique sua conexão e tente novamente.');
  }

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg = buildUserMessage(trimmed);

    setMessages((prev) => {
      const historicoAtual = prev;

      setIsLoading(true);
      setError(null);

      chatbotApi(trimmed, historicoAtual)
        .then((data) => {
          const replyText = data?.resposta ?? data?.reply ?? data?.message ?? 'Sem resposta do servidor.';
          setMessages((msgs) => [...msgs, buildBotMessage(replyText)]);
        })
        .catch((err) => {
          console.warn('[useChatbot] Erro:', err.message);
          setError(err.message);
          setMessages((msgs) => [...msgs, buildErrorMessage()]);
        })
        .finally(() => {
          setIsLoading(false);
        });

      return [...historicoAtual, userMsg];
    });
  }, [isLoading]);

  const clearHistory = useCallback(() => {
    messageCounter.current = 1;
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    quickQuestions: QUICK_QUESTIONS,
    sendMessage,
    clearHistory,
  };
}
