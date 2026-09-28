import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { AdminUser } from '../api/adminAuth';
import { adminLogin, adminMe, adminLogout } from '../api/adminAuth';
import type { PermissionKey } from '../constants/permissions';
import { isPermissionGranted } from '../constants/permissions';
import {
  fetchMyPermissions,
  type UserPermissionConfig,
} from '../api/permissions';

const TOKEN_KEY = 'gym_admin_token';
const USER_KEY = 'gym_admin_user';

const EMPTY_CONFIG: UserPermissionConfig = {
  storeIds: [],
  permissions: [],
};

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  isSuperAdmin: boolean;
  config: UserPermissionConfig;
  hasPermission: (key: PermissionKey, storeId?: string) => boolean;
  refreshPermissions: () => Promise<void>;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<UserPermissionConfig>(EMPTY_CONFIG);

  const loadPermissions = useCallback(async () => {
    try {
      const c = await fetchMyPermissions();
      setConfig(c);
    } catch (e) {
      console.warn('[AuthContext] 拉取权限失败', e);
      setConfig(EMPTY_CONFIG);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
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

        if (res.user.role === 'admin') {
          setConfig(EMPTY_CONFIG);
        } else {
          await loadPermissions();
        }
      } catch (e) {
        console.warn('[AuthContext] 本地 token 失效，清除');
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
        setConfig(EMPTY_CONFIG);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadPermissions]);

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

    if (res.user.role === 'admin') {
      setConfig(EMPTY_CONFIG);
    } else {
      await loadPermissions();
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
    setConfig(EMPTY_CONFIG);
  };

  const refreshPermissions = useCallback(async () => {
    if (!token) return;
    await loadPermissions();
  }, [token, loadPermissions]);

  const isSuperAdmin = user?.role === 'admin';

  const hasPermission = useCallback(
    (key: PermissionKey, storeId?: string): boolean => {
      if (isSuperAdmin) return true;
      return isPermissionGranted(config, key, storeId);
    },
    [isSuperAdmin, config]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isSuperAdmin,
        config,
        hasPermission,
        refreshPermissions,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}