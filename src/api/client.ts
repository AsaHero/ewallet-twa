import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { Account, User, Transaction, TransactionsResponse, Category, Subcategory, StatsGroupBy, StatsTxType, TimeseriesStatsView, CategoryStatsView, SubcategoryStatsView, BalanceTimeseriesMode, BalanceTimeseriesView } from '../core/types';
import { authService } from '../services/auth.service';

class APIClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.kapusta.whereismy.city/api',
            timeout: 10000,
            paramsSerializer: (params) => {
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value === undefined || value === null) return;
                    if (Array.isArray(value)) {
                        value.forEach((v) => searchParams.append(key, v.toString()));
                    } else {
                        searchParams.append(key, value.toString());
                    }
                });
                return searchParams.toString();
            },
        });

        // Add request interceptor to inject token
        this.client.interceptors.request.use((config) => {
            const token = authService.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Add response interceptor to handle auth errors
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    // Token expired or invalid
                    authService.clearToken();
                    // Could trigger re-authentication here
                }
                return Promise.reject(error);
            }
        );
    }

    setToken(token: string) {
        authService.setToken(token);
    }

    // --- Users ---
    async getMe(): Promise<User> {
        const res = await this.client.get<User>('/users/me');
        return res.data;
    }

    // --- Accounts ---
    async getAccounts(): Promise<Account[]> {
        const res = await this.client.get<Account[]>('/accounts');
        return res.data;
    }

    async createAccount(data: { name: string; is_default?: boolean }): Promise<Account> {
        const res = await this.client.post<Account>('/accounts', data);
        return res.data;
    }

    async updateAccount(id: string, data: { name?: string; is_default?: boolean }): Promise<Account> {
        const res = await this.client.patch<Account>(`/accounts/${id}`, data);
        return res.data;
    }

    async deleteAccount(id: string): Promise<void> {
        await this.client.delete(`/accounts/${id}`);
    }

    // --- Categories ---
    async getCategories(): Promise<Category[]> {
        const res = await this.client.get<Category[]>('/categories');
        return res.data;
    }

    async getSubcategories(): Promise<Subcategory[]> {
        const res = await this.client.get<Subcategory[]>('/subcategories');
        return res.data;
    }

    async createCategory(data: { name: string; emoji: string }): Promise<Category> {
        const res = await this.client.post<Category>('/categories', data);
        return res.data;
    }

    async createSubcategory(data: { category_id: number; name: string; emoji: string }): Promise<Subcategory> {
        const res = await this.client.post<Subcategory>('/subcategories', data);
        return res.data;
    }

    async deleteCategory(id: string): Promise<void> {
        await this.client.delete(`/categories/${id}`);
    }

    async deleteSubcategory(id: string): Promise<void> {
        await this.client.delete(`/subcategories/${id}`);
    }

    // --- Transactions ---
    async getTransactions(params?: {
        limit?: number;
        offset?: number;
        from?: string;  // ISO date string
        to?: string;    // ISO date string
        type?: StatsTxType;
        category_ids?: number[];
        subcategory_ids?: number[];
        account_ids?: string[];
        min_amount?: number;
        max_amount?: number;
        search?: string;
    }): Promise<TransactionsResponse> {
        const res = await this.client.get<TransactionsResponse>('/transactions', { params });
        return res.data;
    }

    async getTransaction(id: string): Promise<Transaction> {
        const res = await this.client.get<Transaction>(`/transactions/${id}`);
        return res.data;
    }

    async createTransaction(data: {
        account_id: string;
        type: 'withdrawal' | 'deposit';
        amount: number;
        currency_code?: string;
        category_id?: number;
        subcategory_id?: number;
        note?: string;
        performed_at?: string;
        original_amount?: number;
        original_currency_code?: string;
        fx_rate?: number;
    }): Promise<Transaction> {
        const res = await this.client.post<Transaction>('/transactions', data);
        return res.data;
    }

    async updateTransaction(id: string, data: {
        type: 'withdrawal' | 'deposit';
        amount: number;
        currency_code?: string;
        category_id?: number;
        subcategory_id?: number;
        note?: string;
        performed_at?: string;
        original_amount?: number;
        original_currency_code?: string;
        fx_rate?: number;
    }): Promise<Transaction> {
        const res = await this.client.put<Transaction>(`/transactions/${id}`, data);
        return res.data;
    }

    async deleteTransaction(id: string): Promise<void> {
        await this.client.delete(`/transactions/${id}`);
    }

    // --- User ---
    async updateUser(data: { currency_code?: string; language_code?: string; timezone?: string }): Promise<User> {
        const res = await this.client.patch<User>('/users/me', data);
        return res.data;
    }

    // --- Stats ---
    async getStatsTimeseries(params: {
        from: string;
        to: string;
        group_by: StatsGroupBy;
        type?: StatsTxType;
        account_ids?: string[];
        category_ids?: number[];
        subcategory_ids?: number[];
    }): Promise<TimeseriesStatsView> {
        const res = await this.client.get<TimeseriesStatsView>('/stats/timeseries', { params });
        return res.data;
    }

    async getStatsBalanceTimeseries(params: {
        from: string;
        to: string;
        group_by: StatsGroupBy;
        mode?: BalanceTimeseriesMode; // default aggregate
        account_ids?: string[];
    }): Promise<BalanceTimeseriesView> {
        const res = await this.client.get<BalanceTimeseriesView>('/stats/timeseries/balance', { params });
        return res.data;
    }

    async getStatsByCategory(params: {
        from: string;
        to: string;
        type?: StatsTxType;
        account_ids?: string[];
        category_ids?: number[];
    }): Promise<CategoryStatsView> {
        const res = await this.client.get<CategoryStatsView>('/stats/by-category', { params });
        return res.data;
    }

    async getStatsBySubcategory(params: {
        from: string;
        to: string;
        type?: StatsTxType;
        account_ids?: string[];
        category_ids?: number[];
    }): Promise<SubcategoryStatsView> {
        const res = await this.client.get<SubcategoryStatsView>('/stats/by-subcategory', { params });
        return res.data;
    }
}

export const apiClient = new APIClient();
