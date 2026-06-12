import { createContext, useState, useCallback } from 'react';
import { autenticacaoApi } from '../api/api';

export const ContextoAutenticacao = createContext(null);

export function ProvedorAutenticacao({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('episee_user');
    return salvo ? JSON.parse(salvo) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('episee_token'));
  const [carregando, setCarregando] = useState(false);

  const estaAutenticado = !!token && !!usuario;

  const entrar = useCallback(async (email, senha) => {
  setCarregando(true);
  try {
    const { data } = await autenticacaoApi.login(email, senha);

    localStorage.setItem('episee_token', data.access_token);
    localStorage.setItem('episee_user', JSON.stringify(data.user ?? { email }));
    setToken(data.access_token);
    setUsuario(data.user ?? { email });

    return { sucesso: true };
  } catch (erro) {
    return {
      sucesso: false,
      erro: erro.response?.data?.detail || 'Erro ao conectar com o servidor.',
    };
  } finally {
    setCarregando(false);
  }
}, []);

  const sair = useCallback(() => {
    localStorage.removeItem('episee_token');
    localStorage.removeItem('episee_user');
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <ContextoAutenticacao.Provider value={{ usuario, token, carregando, estaAutenticado, entrar, sair }}>
      {children}
    </ContextoAutenticacao.Provider>
  );
}
