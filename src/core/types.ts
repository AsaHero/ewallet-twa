export interface User {
    id: string;
    tg_user_id: number;
    currency_code?: string;
    timezone?: string;
    language_code?: string;
    first_name?: string;
    last_name?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Account {
    id: string;
    name: string;
    balance: number;
    is_default: boolean;
}

export interface Category {
    id: number;
    name: string;
    emoji?: string;
    position?: number;
    user_id?: string;
}

export interface Subcategory {
    id: number;
    category_id: number;
    name: string;
    emoji?: string;
    position?: number;
    user_id?: string;
}

export interface Transaction {
    id: string;
    account_id: string;
    category_id?: number;
    subcategory_id?: number;
    type: 'withdrawal' | 'deposit';
    amount: number;
    currency_code: string;
    original_amount?: number;
    original_currency_code?: string;
    fx_rate?: number;
    note?: string;
    status?: string;
    performed_at?: string;
    created_at: string;
    rejected_at?: string;
    user_id?: string;
}

export interface TransactionsResponse {
    items: Transaction[];
    pagination: PaginationResponse;
    total_income: number;
    total_expense: number;
    net_balance: number;
}

export interface PaginationResponse {
    total: number;
    limit: number;
    offset: number;
}

export interface TransactionStats {
    total_income: number;
    total_expense: number;
    balance: number;
    income_by_category: CategoryStat[];
    expense_by_category: CategoryStat[];
}

export interface CategoryStat {
    category_id: number;
    category_name: string;
    category_emoji?: string;
    total: number;
}

export interface ParsedTransaction {
  type: 'withdrawal' | 'deposit';
  amount: number;
  currency: string;
  original_amount?: number;
  original_currency?: string;
  fx_rate?: number;
  account_id?: string;
  category_id?: number;
  subcategory_id?: number;
  note?: string;
  confidence: number;
  performed_at?: string;
}


export interface BotUpdateTransactionRequest {
  from: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
  };
  data: ParsedTransaction;
}
