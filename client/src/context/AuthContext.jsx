import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY, syncQueue } from '../lib/api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener('setu:logout', logout);
    return () => window.removeEventListener('setu:logout', logout);
  }, [logout]);

  // NF-5: replay writes that were saved while offline
  useEffect(() => {
    if (!user) return undefined;
    syncQueue();
    const on = () => syncQueue();
    window.addEventListener('online', on);
    const id = setInterval(syncQueue, 30000);
    return () => { window.removeEventListener('online', on); clearInterval(id); };
  }, [user]);

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, refresh, setUser }), [user, loading, login, logout, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
