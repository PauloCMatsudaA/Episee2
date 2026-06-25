import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authEvents, { AUTH_EVENTS } from '../utils/authEvents';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  maxRedirects: 5,
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
      authEvents.emit(AUTH_EVENTS.UNAUTHORIZED);
    }
    return Promise.reject(error);
  }
);

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

export const criarSolicitacao = async (dados) => {
  const sectorId = dados.sector_id != null ? Number(dados.sector_id) : null;

  if (!sectorId || isNaN(sectorId)) {
    throw new Error('Usuário sem setor definido. Contate o administrador.');
  }

  console.log('[API] criarSolicitacao payload:', {
    epi_type: dados.epi_type,
    sector_id: sectorId,
    reason: dados.reason || null,
  });

  const response = await api.post('/epi-requests', {
    epi_type: dados.epi_type,
    sector_id: sectorId,
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

export const getSetores = async () => {
  const response = await api.get('/sectors');
  return response.data;
};

export const getVideosWorker = async () => {
  const response = await api.get('/training/worker/epis');
  return response.data;
};

export const chatbotApi = async (mensagem, historico = []) => {
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
