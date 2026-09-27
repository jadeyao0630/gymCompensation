import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AdminUser } from '../api/adminAuth';
import { adminLogin, adminMe, adminLogout } from '../api/adminAuth';

const TOKEN_KEY = 'gym_admin_token';
const USER_KEY = 'gym_admin_user';

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      /* 优先取 localStorage，再取 sessionStorage */
      const savedToken =
        localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
      const savedUser =
        localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {}
      }

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await adminMe(savedToken);
        setUser(res.user);
        setToken(savedToken);
        console.log('[auth] 免密登录成功:', res.user.username);
      } catch (e) {
        console.warn('[auth] 本地 token 失效，清除');
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async (username: string, password: string, remember: boolean) => {
    const res = await adminLogin(username, password);
    setToken(res.token);
    setUser(res.user);

    if (remember) {
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, res.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  };

  const logout = async () => {
    await adminLogout();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}