// Simple auth context backed by the token in localStorage.
import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const d = await api.login({ email, password });
    setToken(d.token);
    setUser(d.user);
  }
  function logout() {
    setToken(null);
    setUser(null);
  }

  const isAdmin = user?.role === 'admin';

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
