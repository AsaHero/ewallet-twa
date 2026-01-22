import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  Account,
  User,
  Transaction,
  TransactionsResponse,
  Category,
  Subcategory,
  StatsGroupBy,
  StatsTxType,
  TimeseriesStatsView,
  CategoryStatsView,
  SubcategoryStatsView,
  BalanceTimeseriesMode,
  BalanceTimeseriesView,
  Debt,
  DebtsResponse,
  ParseTextView,
  ParseTextDebtView,
  ParseImageView,
  ParseAudioView,
  AccountStatsView,
  StatsCompareView,
} from '../core/types';
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

    // BAD MODE: attach token if present. Do NOT auto-authenticate here.
    this.client.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // BAD MODE: if unauthorized -> clear token and bubble error.
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (
          error.response?.status === 401 ||
          error.response?.status === 403 ||
          (error.response?.status === 404 && originalRequest?.url?.includes('/users/me'))
        ) {
          authService.clearToken();
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

  async updateUser(data: { currency_code?: string; language_code?: string; timezone?: string }): Promise<User> {
    const res = await this.client.patch<User>('/users/me', data);
    return res.data;
  }

  async deleteUser(): Promise<void> {
    await this.client.delete('/users/me');
  }

  // --- Accounts ---
  async getAccounts(): Promise<Account[]> {
    const res = await this.client.get<Account[]>('/accounts');
    return res.data;
  }

  async createAccount(data: { name: string; balance?: number; is_default?: boolean }): Promise<Account> {
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
    from?: string;
    to?: string;
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
    category_id?: number;
    subcategory_id?: number;
    note?: string;
    performed_at?: string;
  }): Promise<Transaction> {
    const res = await this.client.put<Transaction>(`/transactions/${id}`, data);
    return res.data;
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.client.delete(`/transactions/${id}`);
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
    mode?: BalanceTimeseriesMode;
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

  async getStatsByAccount(params: { from: string; to: string; type?: StatsTxType }): Promise<AccountStatsView> {
    const res = await this.client.get<AccountStatsView>('/stats/by-account', { params });
    return res.data;
  }

  async getStatsCompare(params: {
    period?: 'this_month_vs_last_month' | 'last_7_days_vs_previous_7_days' | 'this_year_vs_last_year';
    base_from?: string;
    base_to?: string;
    compare_from?: string;
    compare_to?: string;
    account_ids?: string[];
    type?: StatsTxType;
    top_limit?: number;
  }): Promise<StatsCompareView> {
    const res = await this.client.get<StatsCompareView>('/stats/compare', { params });
    return res.data;
  }

  // --- Debts ---
  async getDebts(params?: {
    limit?: number;
    offset?: number;
    transaction_ids?: string[];
    types?: ('borrow' | 'lend')[];
    statuses?: ('open' | 'paid' | 'cancelled')[];
  }): Promise<DebtsResponse> {
    const res = await this.client.get<DebtsResponse>('/debts', { params });
    return res.data;
  }

  async getDebt(id: string): Promise<Debt> {
    const res = await this.client.get<Debt>(`/debts/${id}`);
    return res.data;
  }

  async createDebt(data: {
    type: 'borrow' | 'lend';
    amount: number;
    currency_code?: string;
    person_name: string;
    note?: string;
    due_date?: string;
    transaction_id?: string;
  }): Promise<Debt> {
    const res = await this.client.post<Debt>('/debts', data);
    return res.data;
  }

  async updateDebt(id: string, data: { amount?: number; name?: string; note?: string; due_at?: string }): Promise<Debt> {
    const res = await this.client.put<Debt>(`/debts/${id}`, data);
    return res.data;
  }

  async payDebt(id: string, data: { paid_at?: string }): Promise<Debt> {
    const res = await this.client.post<Debt>(`/debts/${id}/pay`, data);
    return res.data;
  }

  async cancelDebt(id: string): Promise<Debt> {
    const res = await this.client.post<Debt>(`/debts/${id}/cancel`);
    return res.data;
  }

  // --- Parse ---
  async parseText(data: { text: string; language_code?: string }): Promise<ParseTextView> {
    const res = await this.client.post<ParseTextView>('/parse/text', data);
    return res.data;
  }

  async parseDebtText(data: { text: string; language_code?: string }): Promise<ParseTextDebtView> {
    const res = await this.client.post<ParseTextDebtView>('/parse/debt/text', data);
    return res.data;
  }

  async parseImage(data: { image_url: string; language_code?: string }): Promise<ParseImageView> {
    const res = await this.client.post<ParseImageView>('/parse/image', data);
    return res.data;
  }

  async parseVoice(data: { audio_url: string; language_code?: string }): Promise<ParseAudioView> {
    const res = await this.client.post<ParseAudioView>('/parse/voice', data);
    return res.data;
  }
}

export const apiClient = new APIClient();
