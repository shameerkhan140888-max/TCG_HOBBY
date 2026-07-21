import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicAccount, PublicSession, PublicSessionUser } from '@tcg-hobby/types';
import { apiRequest } from './api';

const SESSION_KEY = 'tcg-hobby-session-token';
type AuthContextValue = {
  token: string | null; user: PublicSessionUser | null; loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, confirmPassword: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  updateProfile(name: string): Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (session: PublicSession) => {
    await SecureStore.setItemAsync(SESSION_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const saved = token ?? await SecureStore.getItemAsync(SESSION_KEY);
    if (!saved) { setLoading(false); return; }
    try {
      const account = await apiRequest<PublicAccount>('/v1/account', { token: saved });
      setToken(saved); setUser(account.user);
    } catch { await clear(); }
    finally { setLoading(false); }
  }, [clear, token]);

  useEffect(() => { void refresh(); }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token, user, loading,
    login: async (email, password) => applySession(await apiRequest<PublicSession>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })),
    register: async (email, password, confirmPassword) => applySession(await apiRequest<PublicSession>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, confirmPassword }) })),
    logout: async () => { try { await apiRequest('/v1/auth/logout', { method: 'POST', token }); } finally { await clear(); } },
    updateProfile: async (name) => {
      const account = await apiRequest<PublicAccount>('/v1/account/profile', { method: 'PATCH', token, body: JSON.stringify({ name }) });
      setUser(account.user);
    },
    refresh,
  }), [applySession, clear, loading, refresh, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
