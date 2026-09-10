import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { authApi, userApi } from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('devtracker-auth-token')) { setLoading(false); return; }
    userApi.getProfile().then(res => setUser(res.data)).catch(() => localStorage.removeItem('devtracker-auth-token')).finally(() => setLoading(false));
  }, []);
  const finishAuth = useCallback((result) => { localStorage.setItem('devtracker-auth-token', result.data.token); setUser(result.data.user); }, []);
  const login = useCallback(async (data) => finishAuth(await authApi.login(data)), [finishAuth]);
  const register = useCallback(async (data) => finishAuth(await authApi.register(data)), [finishAuth]);
  const logout = useCallback(async () => { try { await authApi.logout(); } finally { localStorage.removeItem('devtracker-auth-token'); setUser(null); } }, []);
  return <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>;
}
