// src/api/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor de request: injeta o token em toda requisição
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

// Interceptor de response: se 401 limpa o storage
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
  const response = await api.get('/auth/me');   // sem barra final
  return response.data;
};

export const logoutApi = async () => {
  await AsyncStorage.multiRemove(['@episee:token', '@episee:user']);
};

// ── Solicitações de EPI ───────────────────────────────────────────────────
export const criarSolicitacao = async (dados) => {
  const response = await api.post('/epi-requests', {   // sem barra final
    epi_type: dados.epi_type,
    sector_id: Number(dados.sector_id),
    reason: dados.reason || null,
  });
  return response.data;
};

export const minhasSolicitacoes = async () => {
  const response = await api.get('/epi-requests/my');  // sem barra final
  return response.data;
};

export const todasSolicitacoes = async () => {
  const response = await api.get('/epi-requests');     // sem barra final
  return response.data;
};

// ── Setores ───────────────────────────────────────────────────────────────
export const getSetores = async () => {
  const response = await api.get('/sectors');          // sem barra final
  return response.data;
};

// ── Vídeos de Treinamento ─────────────────────────────────────────────────
export const getVideosWorker = async () => {
  const response = await api.get('/training/worker/epis');
  return response.data;
};

// ── Chatbot ───────────────────────────────────────────────────────────────
const chatbotCliente = axios.create({
  baseURL: 'http://10.0.0.246:8001',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const chatbotApi = async (mensagem, telefone = 'app-user') => {
  const response = await chatbotCliente.post('/chat', {
    message: mensagem,
    phone: telefone,
  });
  return response.data;
};

export default api;
