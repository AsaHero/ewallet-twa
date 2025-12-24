import type { BotUpdateTransactionRequest } from '@/core/types';
import axios, { type AxiosInstance } from 'axios';

class BotClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: import.meta.env.VITE_BOT_API_URL || 'https://kapusta.whereismy.city/api',
            timeout: 10000,
        });
    }

    async updateTransaction(data: BotUpdateTransactionRequest): Promise<void> {
        await this.client.post('/miniapp/transactions/callback', data);
    }
}

export const botClient = new BotClient();
