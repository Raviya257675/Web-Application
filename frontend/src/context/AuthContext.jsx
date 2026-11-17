import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { readSession, writeSession, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (readSession()?.accessToken) await authApi.logout();
    } catch {
      /* token disposal is client-side */
    }
    writeSession(null);
    setSession(null);
  }, []);

  useEffect(() => setUnauthorizedHandler(() => setSession(null)), []);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      const stored = readSession();
      if (!stored?.accessToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.me();
        if (cancelled) return;
        const next = { ...stored, user: data };
        writeSession(next);
        setSession(next);
      } catch {
        if (!cancelled) {
          writeSession(null);
          setSession(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    verify();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);
    const next = { user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
    writeSession(next);
    setSession(next);
    return next.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    return data;
  }, []);

  const updateUser = useCallback((user) => {
    const stored = readSession();
    if (!stored) return;
    const next = { ...stored, user };
    writeSession(next);
    setSession(next);
  }, []);

  const value = useMemo(() => ({
    user: session?.user || null,
    role: session?.user?.role || null,
    isAuthenticated: Boolean(session?.accessToken),
    loading,
    login,
    register,
    logout,
    updateUser,
  }), [session, loading, login, register, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function homePathFor(role) {
  return '/' + (['ADMIN','DOCTOR','PATIENT','RECEPTIONIST','PHARMACIST'].includes(role) ? role.toLowerCase() : 'patient');
}
