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

export type StatsGroupBy = 'day' | 'week' | 'month';
export type StatsTxType = 'deposit' | 'withdrawal' | 'transfer' | 'adjustment';
export type BalanceTimeseriesMode = 'aggregate' | 'per_account';

export type TimeseriesDataPoint = {
  ts: string;
  income: number;
  expense: number;
  net: number;
  count: number;
};

export type TimeseriesTotals = {
  income: number;
  expense: number;
  net: number;
  count: number;
};

export type TimeseriesStatsView = {
  from: string;
  to: string;
  group_by: StatsGroupBy;
  points: TimeseriesDataPoint[];
  totals: TimeseriesTotals;
};

export type CategoryStatsView = {
  from: string;
  to: string;
  type: string; // deposit/withdrawal
  totals: CategoryStatsTotals;
  items: CategoryStatsItem[];
};

export type SubcategoryStatsView = {
  from: string;
  to: string;
  type: string; // deposit/withdrawal
  totals: SubcategoryStatsTotals;
  items: SubcategoryStatsItem[];
};

export type CategoryStatsItem = {
  category_id: number;
  name: string;
  emoji: string;
  total: number;
  count: number;
  share: number;
};

export type CategoryStatsTotals = {
  total: number;
  count: number;
};

export type SubcategoryStatsItem = {
  subcategory_id: number;
  name: string;
  emoji: string;
  total: number;
  count: number;
  share: number;
};

export type SubcategoryStatsTotals = {
  total: number;
  count: number;
};

export type BalanceTimeseriesPointView = {
  ts: string;            // bucket timestamp (string)
  balance_open: number;  // balance at bucket start
  balance_close: number; // balance at bucket end
  delta: number;         // close - open
  min_balance: number;   // min within bucket
  max_balance: number;   // max within bucket
  tx_count: number;      // number of tx in bucket
};

export type BalanceTimeseriesTotalsView = {
  start_balance: number;
  end_balance: number;
  change: number;
  min_balance: number;
  max_balance: number;
  tx_count: number;
};

export type AccountBalanceSeriesView = {
  account_id: string;
  points: BalanceTimeseriesPointView[];
};

export type BalanceTimeseriesView = {
  from: string;
  to: string;
  group_by: StatsGroupBy;
  mode: BalanceTimeseriesMode;
  account_ids?: string[];
  // aggregate mode
  points?: BalanceTimeseriesPointView[];
  // per_account mode
  series?: AccountBalanceSeriesView[];
  totals: BalanceTimeseriesTotalsView;
};

export interface AccountStatsItem {
    account_id: string;
    account_name: string;
    total_amount: number;
    share: number;
    transaction_count: number;
}

export interface AccountStatsView {
    accounts: AccountStatsItem[];
    total_amount: number;
    total_transactions: number;
}

export interface StatsCompareView {
    base_period: {
        from: string;
        to: string;
        total_income: number;
        total_expense: number;
        net: number;
    };
    compare_period: {
        from: string;
        to: string;
        total_income: number;
        total_expense: number;
        net: number;
    };
    changes: {
        income_change: number;
        expense_change: number;
        net_change: number;
        income_change_percent: number;
        expense_change_percent: number;
        net_change_percent: number;
    };
    top_increases?: Array<{
        category_id: number;
        category_name: string;
        emoji: string;
        base_amount: number;
        compare_amount: number;
        change: number;
        change_percent: number;
    }>;
    top_decreases?: Array<{
        category_id: number;
        category_name: string;
        emoji: string;
        base_amount: number;
        compare_amount: number;
        change: number;
        change_percent: number;
    }>;
}

// Debts
export interface Debt {
    id: string;
    user_id: string;
    transaction_id?: string;
    type: 'borrow' | 'lend';
    status: 'open' | 'paid' | 'cancelled';
    amount: number;
    currency_code: string;
    person_name: string;
    note?: string;
    due_date?: string;
    created_at: string;
    updated_at: string;
}

export interface DebtsResponse {
    items: Debt[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
}

// Parse
export interface ParseTextView {
    amount?: number;
    currency?: string;
    category?: string;
    note?: string;
    confidence?: number;
}

export interface ParseTextDebtView {
    amount?: number;
    currency?: string;
    person_name?: string;
    note?: string;
    type?: 'borrow' | 'lend';
    due_date?: string;
    confidence?: number;
}

export interface ParseImageView {
    text: string;
    parsed?: ParseTextView;
}

export interface ParseAudioView {
    text: string;
    parsed?: ParseTextView;
}

