import React, { createContext, useState, useEffect } from 'react';
import { autenticacaoApi } from '../api/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('episee_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('episee_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await autenticacaoApi.login(email, password);
    const data = response.data;
    setUser(data.user);
    localStorage.setItem('episee_user', JSON.stringify(data.user));
    localStorage.setItem('episee_token', data.access_token);
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('episee_user');
    localStorage.removeItem('episee_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
