import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://api.kapusta.whereismy.city/api';

const TOKEN_KEY = 'ewallet_token';

export class AuthService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * BAD MODE:
   * ensureToken does NOT try to authenticate.
   * It only returns a token if it exists.
   */
  async ensureToken(): Promise<string> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    return this.token;
  }

  /**
   * BAD AUTH (TEMPORARY):
   * Authenticate only using tg_user_id.
   * WARNING: insecure if backend doesn't validate Telegram signature.
   */
  async authenticateWithUserId(
    userId: number,
    userData: {
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    }
  ): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/telegram`, {
        tg_user_id: userId,
        ...userData,
      });

      const token = response.data.token;
      if (!token) throw new Error('Token is missing in response');

      this.setToken(token);
      return token;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Failed to authenticate');
    }
  }

  /**
   * Bot can open MiniApp with ?token=...
   */
  getTokenFromURL(): string | null {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      this.setToken(token);
    }
    return token;
  }
}

export const authService = new AuthService();
