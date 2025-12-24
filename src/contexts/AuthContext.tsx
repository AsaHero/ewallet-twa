import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';
import { authService } from '../services/auth.service';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import type { User } from '../core/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: tgUser, isReady, initData } = useTelegramWebApp();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check for token in URL (bot-provided)
      let token = authService.getTokenFromURL();

      // 2. If no token, authenticate with initData or user ID
      if (!token) {
        token = authService.getToken();

        if (!token && initData) {
          // Try initData authentication
          try {
            await authService.authenticateWithInitData(initData);
          } catch (err) {
            // Fallback to user ID authentication
            if (tgUser) {
              await authService.authenticateWithUserId(tgUser.id, {
                first_name: tgUser.first_name,
                last_name: tgUser.last_name,
                username: tgUser.username,
                language_code: tgUser.language_code,
              });
            } else {
              throw new Error('No Telegram user data available');
            }
          }
        }
      }

      // 3. Fetch user data
      const userData = await apiClient.getMe();
      setUser(userData);
    } catch (err) {
      console.error('Authentication failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    authenticate();
  }, [isReady, initData, tgUser]);

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
