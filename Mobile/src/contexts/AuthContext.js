import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi } from '../api/api';
import authEvents, { AUTH_EVENTS } from '../utils/authEvents';

const STORAGE_TOKEN_KEY = '@episee:token';
const STORAGE_USER_KEY  = '@episee:user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarSessao = async () => {
      try {
        const [tokenSalvo, userSalvo] = await AsyncStorage.multiGet([
          STORAGE_TOKEN_KEY,
          STORAGE_USER_KEY,
        ]);
        const tokenVal = tokenSalvo[1];
        const userVal  = userSalvo[1];
        if (tokenVal && userVal) {
          setToken(tokenVal);
          setUser(JSON.parse(userVal));
        }
      } catch (error) {
        console.warn('[AuthContext] Erro ao carregar sessão:', error);
      } finally {
        setLoading(false);
      }
    };
    carregarSessao();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('[AuthContext] Token expirado ou inválido — fazendo logout automático.');
      setToken(null);
      setUser(null);
    };

    authEvents.on(AUTH_EVENTS.UNAUTHORIZED, handleUnauthorized);
    return () => authEvents.off(AUTH_EVENTS.UNAUTHORIZED, handleUnauthorized);
  }, []);

  const login = async (email, senha) => {
    const dados = await loginApi(email, senha);
    await AsyncStorage.multiSet([
      [STORAGE_TOKEN_KEY, dados.token],
      [STORAGE_USER_KEY, JSON.stringify(dados.user)],
    ]);
    setToken(dados.token);
    setUser(dados.user);
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_TOKEN_KEY, STORAGE_USER_KEY]);
    } catch (error) {
      console.warn('[AuthContext] Erro ao remover sessão:', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAutenticado: !!token,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
}

export default AuthContext;
