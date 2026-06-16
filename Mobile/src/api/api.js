// src/api/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

console.log('[API] BASE_URL =', BASE_URL);
console.log('[API] Chatbot URL =', BASE_URL + '/chatbot/texto');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@episee:token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.warn('[API] Erro ao obter token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['@episee:token', '@episee:user']);
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const loginApi = async (email, senha) => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', senha);

  const response = await api.post('/auth/login', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const { access_token, user } = response.data;
  await AsyncStorage.setItem('@episee:token', access_token);
  await AsyncStorage.setItem('@episee:user', JSON.stringify(user));

  return { token: access_token, user };
};

export const getMeuPerfil = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logoutApi = async () => {
  await AsyncStorage.multiRemove(['@episee:token', '@episee:user']);
};

// ── Solicitações de EPI ───────────────────────────────────────────────────
export const criarSolicitacao = async (dados) => {
  const response = await api.post('/epi-requests', {
    epi_type: dados.epi_type,
    sector_id: Number(dados.sector_id),
    reason: dados.reason || null,
  });
  return response.data;
};

export const minhasSolicitacoes = async () => {
  const response = await api.get('/epi-requests/my');
  return response.data;
};

export const todasSolicitacoes = async () => {
  const response = await api.get('/epi-requests');
  return response.data;
};

// ── Setores ───────────────────────────────────────────────────────────────
export const getSetores = async () => {
  const response = await api.get('/sectors');
  return response.data;
};

// ── Vídeos de Treinamento ─────────────────────────────────────────────────
export const getVideosWorker = async () => {
  const response = await api.get('/training/worker/epis');
  return response.data;
};

// ── Chatbot ───────────────────────────────────────────────────────────────
/**
 * @param {string} mensagem - mensagem atual do usuario
 * @param {Array<{role: string, text: string}>} historico - mensagens anteriores da conversa
 */
export const chatbotApi = async (mensagem, historico = []) => {
  // Converte historico do formato interno para formato da API
  // Exclui a mensagem de boas-vindas (id '0') e limita a 10 mensagens anteriores
  const historicoFormatado = historico
    .filter((m) => m.id !== '0')
    .slice(-10)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  const response = await api.post('/chatbot/texto', {
    mensagem,
    historico: historicoFormatado,
  });
  return response.data;
};

export default api;
