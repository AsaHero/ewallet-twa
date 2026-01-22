import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';
import { authService } from '../services/auth.service';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import type { User } from '../core/types';
import i18n from '../i18n/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: tgUser, isReady } = useTelegramWebApp();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) token from URL (?token=...)
      let token = authService.getTokenFromURL();

      // 2) token from storage
      if (!token) token = authService.getToken();

      // 3) if no token -> BAD auth by tg_user_id
      if (!token) {
        if (!tgUser) throw new Error('Telegram user is not available');
        await authService.authenticateWithUserId(tgUser.id, {
          first_name: tgUser.first_name,
          last_name: tgUser.last_name,
          username: tgUser.username,
          language_code: tgUser.language_code,
        });
      }

      // 4) fetch user
      const me = await apiClient.getMe();
      if (me.language_code) {
        await i18n.changeLanguage(me.language_code);
      }
      setUser(me);
    } catch (err) {
      console.error('Authentication failed:', err);
      setUser(null);
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    authenticate();
  }, [isReady, tgUser?.id]);

  return (
    <AuthContext.Provider value={{ user, loading, error, refetch: authenticate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
