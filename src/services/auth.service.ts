import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.kapusta.whereismy.city/api';
const TOKEN_KEY = 'ewallet_token';

export class AuthService {
    private token: string | null = null;
    private authPromise: Promise<string> | null = null;

    constructor() {
        // Load token from localStorage on init
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
     * Ensures we have a valid token. If not, automatically authenticates.
     * Prevents concurrent authentication attempts by reusing the same promise.
     */
    async ensureToken(): Promise<string> {
        // If we already have a token, return it
        if (this.token) {
            return this.token;
        }

        // If authentication is already in progress, wait for it
        if (this.authPromise) {
            return this.authPromise;
        }

        // Start new authentication
        this.authPromise = this.authenticate();

        try {
            const token = await this.authPromise;
            return token;
        } finally {
            // Clear the promise after completion (success or failure)
            this.authPromise = null;
        }
    }

    /**
     * Perform authentication using Telegram WebApp initData
     */
    private async authenticate(): Promise<string> {
        try {
            // Get initData from Telegram WebApp
            const initData = window.Telegram?.WebApp?.initData;

            if (!initData) {
                throw new Error('Telegram WebApp initData not available');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/telegram`, {
                init_data: initData,
            });

            const token = response.data.token;
            this.setToken(token);
            return token;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw new Error('Failed to authenticate with Telegram');
        }
    }

    async authenticateWithInitData(initData: string): Promise<string> {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/telegram`, {
                init_data: initData,
            });

            const token = response.data.token;
            this.setToken(token);
            return token;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw new Error('Failed to authenticate with Telegram');
        }
    }

    async authenticateWithUserId(userId: number, userData: {
        first_name: string;
        last_name?: string;
        username?: string;
        language_code?: string;
    }): Promise<string> {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/telegram`, {
                tg_user_id: userId,
                ...userData,
            });

            const token = response.data.token;
            this.setToken(token);
            return token;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw new Error('Failed to authenticate');
        }
    }

    // Check if we have a token from URL params (bot-provided)
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
