import axios, { type AxiosInstance } from 'axios';

class BotClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: import.meta.env.VITE_BOT_API_URL || 'https://kapusta.whereismy.city/api',
            timeout: 10000,
        });
    }

    async sendWebAppData(data: any): Promise<void> {
        await this.client.post('/webapp-data', data);
    }
}

export const botClient = new BotClient();
