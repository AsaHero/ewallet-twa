import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import type { Transaction, User, Category, Subcategory, Account } from '../core/types';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import {
    formatCurrency,
    groupTransactionsByDate,
    calculateMonthlyStats,
    getMonthDateRange,
} from '../lib/formatters';
import { cn } from '../lib/utils';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { SummaryCard } from '../components/history/SummaryCard';
import { FilterChips, type FilterType } from '../components/history/FilterChips';
import { TransactionDetailModal } from '../components/history/TransactionDetailModal';

function HistoryPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isReady } = useTelegramWebApp();

    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter and navigation state
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    useEffect(() => {
        if (!isReady) return;

        const fetchData = async () => {
            try {
                const [userData, categoriesData, subcategoriesData, accountsData] = await Promise.all([
                    apiClient.getMe(),
                    apiClient.getCategories(),
                    apiClient.getSubcategories(),
                    apiClient.getAccounts(),
                ]);

                setUser(userData);
                setCategories(categoriesData);
                setSubcategories(subcategoriesData);
                setAccounts(accountsData);

                // Fetch transactions for selected month
                await fetchMonthTransactions(selectedMonth);
            } catch (err) {
                console.error('Failed to fetch history:', err);
                setError(err instanceof Error ? err.message : 'Failed to load history');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isReady]);

    const fetchMonthTransactions = async (month: Date) => {
        try {
            const { from, to } = getMonthDateRange(month);
            const response = await apiClient.getTransactions({
                from: from.toISOString(),
                to: to.toISOString(),
                limit: 1000, // Get all for the month
            });
            setAllTransactions(response.items);
            applyFilters(response.items, selectedFilter);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        }
    };

    const applyFilters = (transactions: Transaction[], filter: FilterType) => {
        let filtered = transactions;

        if (filter === 'income') {
            filtered = transactions.filter(tx => tx.type === 'deposit');
        } else if (filter === 'expense') {
            filtered = transactions.filter(tx => tx.type === 'withdrawal');
        }

        setFilteredTransactions(filtered);
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newMonth = new Date(selectedMonth);
        if (direction === 'prev') {
            newMonth.setMonth(newMonth.getMonth() - 1);
        } else {
            newMonth.setMonth(newMonth.getMonth() + 1);
        }
        setSelectedMonth(newMonth);
        fetchMonthTransactions(newMonth);
    };

    const handleFilterChange = (filter: FilterType) => {
        setSelectedFilter(filter);
        applyFilters(allTransactions, filter);
    };

    const canGoNext = () => {
        const now = new Date();
        return selectedMonth.getMonth() < now.getMonth() ||
            selectedMonth.getFullYear() < now.getFullYear();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="h-safe-top" />
                <div className="h-14" />
                <div className="px-4 pb-8 max-w-md mx-auto">
                    <Skeleton className="h-10 w-32 mb-8" />
                    <Skeleton className="h-40 w-full rounded-2xl mb-6" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="text-4xl">⚠️</div>
                    <h2 className="text-xl font-semibold text-foreground">{t('common.error')}</h2>
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    const stats = calculateMonthlyStats(filteredTransactions);
    const groupedTransactions = groupTransactionsByDate(
        filteredTransactions,
        user?.timezone,
        user?.language_code
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="h-safe-top" />
            <div className="h-14" />

            <div className="px-4 pb-8 max-w-md mx-auto">
                {/* Header */}
                <header className="pt-2 pb-6">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">{t('common.backToHome')}</span>
                    </button>
                    <h1 className="text-2xl font-bold text-foreground mt-4">{t('common.history')}</h1>
                </header>

                {/* Summary Card */}
                <div className="mb-6">
                    <SummaryCard
                        selectedMonth={selectedMonth}
                        totalIncome={stats.totalIncome}
                        totalExpense={stats.totalExpense}
                        currencyCode={user?.currency_code || 'USD'}
                        locale={user?.language_code}
                        onMonthChange={handleMonthChange}
                        canGoNext={canGoNext()}
                    />
                </div>

                {/* Filter Chips */}
                <div className="mb-6">
                    <FilterChips
                        selectedFilter={selectedFilter}
                        onFilterChange={handleFilterChange}
                    />
                </div>

                {/* Transactions List */}
                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-4">📊</div>
                        <p className="text-muted-foreground">
                            {selectedFilter === 'all'
                                ? t('common.noTransactions')
                                : `No ${selectedFilter} transactions`
                            }
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedTransactions).map(([dateLabel, transactions]) => (
                            <div key={dateLabel}>
                                {/* Date Header */}
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
                                    {dateLabel}
                                </h3>

                                {/* Transaction Cards */}
                                <div className="space-y-2">
                                    {transactions.map((transaction) => {
                                        const category = categories.find((c) => c.id === transaction.category_id);
                                        const subcategory = subcategories.find((s) => s.id === transaction.subcategory_id);
                                        const account = accounts.find((a) => a.id === transaction.account_id);
                                        const isIncome = transaction.type === 'deposit';

                                        return (
                                            <Card
                                                key={transaction.id}
                                                className="border-0 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 cursor-pointer group"
                                                onClick={() => setSelectedTransaction(transaction)}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div
                                                                className={cn(
                                                                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                                                    isIncome
                                                                        ? 'bg-green-500/10'
                                                                        : 'bg-red-500/10'
                                                                )}
                                                            >
                                                                <div className="text-xl">
                                                                    {subcategory?.emoji || category?.emoji || '📌'}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                                <p className="font-medium text-sm text-foreground truncate">
                                                                    {transaction.note ||
                                                                        subcategory?.name ||
                                                                        category?.name ||
                                                                        (isIncome ? 'Income' : 'Expense')}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <span className="truncate">
                                                                        {account?.name || 'Account'}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span>
                                                                        {new Date(
                                                                            transaction.performed_at || transaction.created_at
                                                                        ).toLocaleTimeString(user?.language_code || 'en-US', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p
                                                            className={cn(
                                                                'font-bold tabular-nums text-base ml-3 flex-shrink-0',
                                                                isIncome ? 'text-green-500' : 'text-red-500'
                                                            )}
                                                        >
                                                            {isIncome ? '+' : '-'}
                                                            {formatCurrency(
                                                                transaction.amount,
                                                                transaction.currency_code,
                                                                user?.language_code
                                                            )}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <TransactionDetailModal
                    transaction={selectedTransaction}
                    categories={categories}
                    subcategories={subcategories}
                    accounts={accounts}
                    locale={user?.language_code}
                    timezone={user?.timezone}
                    onClose={() => setSelectedTransaction(null)}
                />
            )}

            <div className="h-safe-bottom" />
        </div>
    );
}

export default HistoryPage;
