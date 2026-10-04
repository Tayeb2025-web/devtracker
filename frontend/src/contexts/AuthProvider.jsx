import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { authApi, userApi } from '../services/api';

const TOKEN_KEY = 'devtracker-auth-token';
const USER_KEY = 'devtracker-user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));
    const hasCachedUser = Boolean(localStorage.getItem(USER_KEY));
    return hasToken && !hasCachedUser;
  });
  const userRef = useRef(user);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    userApi.getProfile()
      .then(res => {
        if (res?.data) {
          setUser(res.data);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
        }
      })
      .catch((err) => {
        if (err?.response?.status === 401 || err?.statusCode === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          userRef.current = null;
          setUser(null);
          window.dispatchEvent(new CustomEvent('devtracker-auth-user-changed', { detail: { userId: null } }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const finishAuth = useCallback((result) => {
    if (result?.data?.token) {
      localStorage.setItem(TOKEN_KEY, result.data.token);
    }
    if (result?.data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(result.data.user));
      userRef.current = result.data.user;
      setUser(result.data.user);
      window.dispatchEvent(new CustomEvent('devtracker-auth-user-changed', { detail: { userId: result.data.user.id } }));
    }
    return result?.data?.user;
  }, []);

  const login = useCallback(async (data) => finishAuth(await authApi.login(data)), [finishAuth]);
  const register = useCallback(async (data) => finishAuth(await authApi.register(data)), [finishAuth]);
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      userRef.current = null;
      setUser(null);
      window.dispatchEvent(new CustomEvent('devtracker-auth-user-changed', { detail: { userId: null } }));
    }
  }, []);

  const updateUser = useCallback((nextUser) => {
    const current = userRef.current;
    const updated = typeof nextUser === 'function' ? nextUser(current) : nextUser;
    userRef.current = updated;
    if (updated) localStorage.setItem(USER_KEY, JSON.stringify(updated));
    else localStorage.removeItem(USER_KEY);
    if (String(current?.id || '') !== String(updated?.id || '')) {
      window.dispatchEvent(new CustomEvent('devtracker-auth-user-changed', { detail: { userId: updated?.id || null } }));
    }
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
