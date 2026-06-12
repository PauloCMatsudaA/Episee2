// src/hooks/useChatbot.js — Chat state management hook
import { useState, useCallback, useRef } from 'react';
import { chatbotApi } from '../api/api';

const WELCOME_MESSAGE = {
  id: '0',
  role: 'bot',
  text: 'Olá! Sou o assistente EPIsee \nPosso ajudar com dúvidas sobre EPIs e segurança do trabalho. O que você precisa saber?',
  timestamp: new Date(),
};

const QUICK_QUESTIONS = [
  'Quais EPIs são obrigatórios para o meu setor?',
  'Como solicitar um EPI novo?',
  'O que diz a NR-6?',
  'Prazo de vida útil do capacete',
];

/**
 * Manages chatbot conversation state.
 * @param {string} userPhone  — unique user identifier for conversation history
 */
export function useChatbot(userPhone = 'app-user') {
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
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const data       = await chatbotApi(trimmed, userPhone);
      const replyText  = data?.resposta ?? data?.reply ?? data?.message ?? 'Sem resposta do servidor.';
      const botMsg     = buildBotMessage(replyText);
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.warn('[useChatbot] Erro:', err.message);
      setError(err.message);
      setMessages((prev) => [...prev, buildErrorMessage()]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userPhone]);

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
