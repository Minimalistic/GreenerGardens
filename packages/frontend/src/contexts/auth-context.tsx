import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  has_pin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPinLocked: boolean;
  needsSetup: boolean;
  login(email: string, password: string): Promise<void>;
  register(email: string, displayName: string, password: string): Promise<void>;
  initialSetup(password: string, email?: string, displayName?: string): Promise<void>;
  logout(): Promise<void>;
  verifyPin(pin: string): Promise<void>;
  refreshAuth(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface MeResponse {
  success: boolean;
  data: {
    user: AuthUser | null;
    status: 'active' | 'pin_required' | 'unauthenticated';
    needs_setup: boolean;
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await api.get<MeResponse>('/auth/me');
      setUser(res.data.user);
      setIsPinLocked(res.data.status === 'pin_required');
      setNeedsSetup(res.data.needs_setup);
    } catch {
      setUser(null);
      setIsPinLocked(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Listen for session-locked events from API interceptor
  useEffect(() => {
    const handler = () => setIsPinLocked(true);
    window.addEventListener('session-locked', handler);
    return () => window.removeEventListener('session-locked', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { user: AuthUser } }>('/auth/login', { email, password });
    setUser(res.data.user);
    setIsPinLocked(false);
    setNeedsSetup(false);
  }, []);

  const register = useCallback(async (email: string, displayName: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { user: AuthUser } }>('/auth/register', {
      email,
      display_name: displayName,
      password,
    });
    setUser(res.data.user);
    setIsPinLocked(false);
  }, []);

  const initialSetup = useCallback(async (password: string, email?: string, displayName?: string) => {
    const res = await api.post<{ success: boolean; data: { user: AuthUser } }>('/auth/initial-setup', {
      password,
      email,
      display_name: displayName,
    });
    setUser(res.data.user);
    setIsPinLocked(false);
    setNeedsSetup(false);
  }, []);

  const logout = useCallback(async () => {
    await api.post<{ success: boolean }>('/auth/logout', {});
    setUser(null);
    setIsPinLocked(false);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    await api.post<{ success: boolean }>('/auth/pin/verify', { pin });
    setIsPinLocked(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isPinLocked,
        needsSetup,
        login,
        register,
        initialSetup,
        logout,
        verifyPin,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
