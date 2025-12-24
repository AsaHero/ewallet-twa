import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import type { Transaction, User } from '../core/types';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { cn } from '../lib/utils';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';

function HistoryPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isReady } = useTelegramWebApp();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isReady) return;

        const fetchData = async () => {
            try {
                const [userData, transactionsResponse] = await Promise.all([
                    apiClient.getMe(),
                    apiClient.getTransactions()
                ]);
                setUser(userData);
                setTransactions(transactionsResponse.items);
            } catch (err) {
                console.error('Failed to fetch history:', err);
                setError(err instanceof Error ? err.message : 'Failed to load history');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isReady]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="h-safe-top" />
                <div className="h-14" />
                <div className="px-4 pb-8 max-w-md mx-auto">
                    <Skeleton className="h-10 w-32 mb-8" />
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

                {/* Transactions List */}
                {transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-4">📊</div>
                        <p className="text-muted-foreground">{t('common.noTransactions')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => (
                            <Card
                                key={transaction.id}
                                className="border-0 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 cursor-pointer group"
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all",
                                                transaction.type === 'deposit'
                                                    ? "bg-gradient-to-br from-green-500/15 to-green-500/5 border border-green-500/10"
                                                    : "bg-gradient-to-br from-red-500/15 to-red-500/5 border border-red-500/10"
                                            )}>
                                                {transaction.type === 'deposit' ? (
                                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <TrendingDown className="w-5 h-5 text-red-500" />
                                                )}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="font-semibold text-base text-foreground">
                                                    {transaction.type === 'deposit' ? t('common.income') : t('common.expense')}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateTime(
                                                        transaction.created_at,
                                                        user?.timezone,
                                                        user?.language_code
                                                    )}
                                                </p>
                                                {transaction.note && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {transaction.note}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "font-bold tabular-nums",
                                                transaction.type === 'deposit' ? "text-green-500" : "text-red-500",
                                                transaction.amount >= 1000000 ? "text-sm" : transaction.amount >= 100000 ? "text-base" : "text-lg"
                                            )}>
                                                {transaction.type === 'deposit' ? '+' : '-'}
                                                {formatCurrency(
                                                    transaction.amount,
                                                    transaction.currency_code,
                                                    user?.language_code
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-safe-bottom" />
        </div>
    );
}

export default HistoryPage;
