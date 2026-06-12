// src/contexts/AuthContext.js — Contexto de autenticação do EPIsee
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi } from '../api/api';

// Chaves de armazenamento local
const STORAGE_TOKEN_KEY = '@episee:token';
const STORAGE_USER_KEY = '@episee:user';

// Criação do contexto
const AuthContext = createContext(null);

/**
 * Provider de autenticação — envolve toda a aplicação
 * Fornece: user, token, loading, login(), logout()
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true); // true enquanto carrega do storage

  // ── Carrega sessão persistida ao iniciar o app ──────────────────────────
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

  // ── Login ───────────────────────────────────────────────────────────────
  /**
   * Autentica o trabalhador e persiste a sessão
   * @param {string} email
   * @param {string} senha
   * @throws {Error} Se as credenciais forem inválidas
   */
  const login = async (email, senha) => {
    const dados = await loginApi(email, senha);

    // Persiste no storage local
    await AsyncStorage.multiSet([
      [STORAGE_TOKEN_KEY, dados.token],
      [STORAGE_USER_KEY, JSON.stringify(dados.user)],
    ]);

    setToken(dados.token);
    setUser(dados.user);
  };

  // ── Logout ──────────────────────────────────────────────────────────────
  /**
   * Remove a sessão e redireciona para o Login
   */
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

  // ── Valor do contexto ───────────────────────────────────────────────────
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

/**
 * Hook para consumir o contexto de autenticação
 * @returns {{ user, token, loading, isAutenticado, login, logout }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export default AuthContext;
