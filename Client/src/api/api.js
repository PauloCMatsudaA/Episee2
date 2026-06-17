import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "https://episee2-production.up.railway.app";

const cliente = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

cliente.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("episee_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (erro) => Promise.reject(erro),
);

cliente.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401) {
      localStorage.removeItem("episee_token");
      localStorage.removeItem("episee_user");
      window.location.href = "/login";
    }
    return Promise.reject(erro);
  },
);

export const autenticacaoApi = {
  login: (email, senha) =>
    cliente.post(
      "/api/auth/login",
      new URLSearchParams({ username: email, password: senha }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    ),
  registrar: (dados) => cliente.post("/api/auth/register", dados),
  me: () => cliente.get("/api/auth/me"),
};

export const usuariosApi = {
  listar:    (filtros)   => cliente.get("/api/users/", { params: filtros }),
  buscarPor: (id)        => cliente.get(`/api/users/${id}`),
  criar:     (dados)     => cliente.post("/api/auth/register", dados),
  editar:    (id, dados) => cliente.patch(`/api/users/${id}`, dados),
  excluir:   (id)        => cliente.delete(`/api/users/${id}`),
};

export const ocorrenciasApi = {
  listar:    (filtros) => cliente.get("/api/occurrences/", { params: filtros }),
  buscarPor: (id)      => cliente.get(`/api/occurrences/${id}`),
  resumo:    (filtros) => cliente.get("/api/occurrences/stats/summary", { params: filtros }),
  criar:     (dados)   => cliente.post("/api/occurrences/", dados),
};

export const dashboardApi = {
  estatisticas: () => cliente.get("/api/dashboard/stats"),
};

export const relatoriosApi = {
  gerarAnalise: (dados) => cliente.post("/api/reports/generate-analysis", dados),
};

export const reportsApi = {
  gerarAnalise: (dados) => cliente.post("/api/reports/generate-analysis", dados),
};

export const solicitacoesApi = {
  listar:   (filtros) => cliente.get("/api/epi-requests/", { params: filtros }),
  criar:    (dados)   => cliente.post("/api/epi-requests/", dados),
  aprovar:  (id)      => cliente.patch(`/api/epi-requests/${id}/approve`),
  rejeitar: (id, motivo) => cliente.patch(`/api/epi-requests/${id}/reject`, { motivo_rejeicao: motivo }),
  entrega:  (id, entregue) => cliente.patch(`/api/epi-requests/${id}/entrega`, { entregue }),
};

export const epiRequestsApi = {
  listar:   (filtros) => cliente.get("/api/epi-requests/", { params: filtros }),
  criar:    (dados)   => cliente.post("/api/epi-requests/", dados),
  aprovar:  (id)      => cliente.patch(`/api/epi-requests/${id}/approve`),
  rejeitar: (id, motivo) => cliente.patch(`/api/epi-requests/${id}/reject`, { motivo_rejeicao: motivo }),
  entrega:  (id, entregue) => cliente.patch(`/api/epi-requests/${id}/entrega`, { entregue }),
};

export const camerasApi = {
  listar:          ()          => cliente.get("/api/cameras/"),
  criar:           (dados)     => cliente.post("/api/cameras/", dados),
  editar:          (id, dados) => cliente.patch(`/api/cameras/${id}`, dados),
  excluir:         (id)        => cliente.delete(`/api/cameras/${id}`),
  iniciarDeteccao: (id)        => cliente.post(`/api/cameras/${id}/start-detection`),
  pararDeteccao:   (id)        => cliente.post(`/api/cameras/${id}/stop-detection`),
};

export const setoresApi = {
  listar:  ()          => cliente.get("/api/sectors/"),
  buscar:  (id)        => cliente.get(`/api/sectors/${id}`),
  stats:   (id)        => cliente.get(`/api/sectors/${id}/stats`),
  criar:   (dados)     => cliente.post("/api/sectors/", dados),
  editar:  (id, dados) => cliente.patch(`/api/sectors/${id}`, dados),
  excluir: (id)        => cliente.delete(`/api/sectors/${id}`),
};

export const notificacoesApi = {
  listar:           ()    => cliente.get("/api/notifications/"),
  contarNaoLidas:   ()    => cliente.get("/api/notifications/unread-count"),
  marcarLida:       (id)  => cliente.patch(`/api/notifications/${id}/read`),
  marcarTodasLidas: ()    => cliente.patch("/api/notifications/read-all"),
};

export const configuracoesApi = {
  buscarPerfil:    (id)        => cliente.get(`/api/users/${id}`),
  atualizarPerfil: (id, dados) => cliente.patch(`/api/users/${id}`, dados),
  alterarSenha:    (id, dados) => cliente.patch(`/api/users/${id}`, dados),
};

export default cliente;
