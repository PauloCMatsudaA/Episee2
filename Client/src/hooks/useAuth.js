import { useContext } from 'react';
import { ContextoAutenticacao } from '../contexts/AuthContext';

export function useAuth() {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de ProvedorAutenticacao');
  return contexto;
}
