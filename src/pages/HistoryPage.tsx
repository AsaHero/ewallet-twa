import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

import { apiClient } from '@/api/client';
import type { Transaction, User, Category, Subcategory, Account } from '@/core/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  groupTransactionsByDate,
  calculateMonthlyStats,
  getMonthDateRange,
  formatDateTime,
} from '@/lib/formatters';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';

import { SummaryCard } from '@/components/history/SummaryCard';
import { FilterChips, type FilterType } from '@/components/history/FilterChips';
import { TransactionDetailModal } from '@/components/history/TransactionDetailModal';
import { FiltersSheet, type HistoryFilters } from '@/components/history/FiltersSheet';
import { useInfiniteTransactions } from '@/hooks/useInfiniteTransactions';
import { useIntersection } from '@/hooks/useIntersection';

function hapticSelect() {
  // safe in web too
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any)?.Telegram?.WebApp;
  try {
    tg?.HapticFeedback?.selectionChanged?.();
  } catch {
    // ignore
  }
}

function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady } = useTelegramWebApp();

  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({
    search: '',
    account_ids: [],
    category_ids: [],
    min_amount: undefined,
    max_amount: undefined,
  });

  useEffect(() => {
    if (!isReady) return;

    const fetchBootstrap = async () => {
      try {
        setLoadingBootstrap(true);
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
      } catch (err) {
        console.error('Failed to fetch history bootstrap:', err);
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoadingBootstrap(false);
      }
    };

    fetchBootstrap();
  }, [isReady]);

  const categoryById = useMemo(() => {
    const m = new Map<number, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const subcategoryById = useMemo(() => {
    const m = new Map<number, Subcategory>();
    subcategories.forEach((s) => m.set(s.id, s));
    return m;
  }, [subcategories]);

  const accountById = useMemo(() => {
    const m = new Map<string, Account>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const { from, to } = useMemo(() => getMonthDateRange(selectedMonth), [selectedMonth]);

  const txType = useMemo(() => {
    if (selectedFilter === 'income') return 'deposit' as const;
    if (selectedFilter === 'expense') return 'withdrawal' as const;
    return undefined;
  }, [selectedFilter]);

  const query = useMemo(() => {
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      limit: 30,
      type: txType,
      search: filters.search,
      category_ids: filters.category_ids,
      account_ids: filters.account_ids,
      min_amount: filters.min_amount,
      max_amount: filters.max_amount,
    };
  }, [from, to, txType, filters]);

  const {
    items: transactions,
    total,
    isInitialLoading,
    isFetchingNext,
    error: txError,
    hasNext,
    fetchNext,
  } = useInfiniteTransactions(query);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useIntersection(
    sentinelRef,
    () => {1
      if (hasNext) fetchNext();
    },
    { rootMargin: '300px 0px 300px 0px' }
  );

  const canGoNext = () => {
    const now = new Date();
    return selectedMonth.getMonth() < now.getMonth() || selectedMonth.getFullYear() < now.getFullYear();
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    hapticSelect();
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') newMonth.setMonth(newMonth.getMonth() - 1);
    else newMonth.setMonth(newMonth.getMonth() + 1);
    setSelectedMonth(newMonth);
  };

  const handleFilterChange = (filter: FilterType) => {
    hapticSelect();
    setSelectedFilter(filter);
  };

  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    (filters.account_ids.length ? 1 : 0) +
    (filters.category_ids.length ? 1 : 0) +
    (filters.min_amount !== undefined ? 1 : 0) +
    (filters.max_amount !== undefined ? 1 : 0);

  const groupedTransactions = useMemo(() => {
    return groupTransactionsByDate(transactions, user?.timezone, user?.language_code);
  }, [transactions, user?.timezone, user?.language_code]);

  const stats = useMemo(() => calculateMonthlyStats(transactions), [transactions]);

  if (loadingBootstrap) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-safe-top" />
        <div className="px-4 pt-3 pb-8 max-w-md mx-auto">
          <Skeleton className="h-9 w-28 mb-4" />
          <Skeleton className="h-40 w-full rounded-3xl mb-4" />
          <Skeleton className="h-10 w-full rounded-full mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="h-safe-bottom" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">{t('common.error')}</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const showEmpty = !isInitialLoading && transactions.length === 0 && !txError;

  return (
    <motion.div
      className="min-h-screen bg-background text-foreground"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="h-safe-top" />

      <div className="px-4 pt-3 pb-8 max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-md -mx-4 px-4 pt-2 pb-3 border-b border-border/40">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">{t('common.backToHome')}</span>
          </button>

          <div className="mt-2 flex items-end justify-between">
            <h1 className="text-xl font-bold text-foreground">{t('common.history')}</h1>
            {total > 0 && (
              <div className="text-xs text-muted-foreground">
                {transactions.length}/{total}
              </div>
            )}
          </div>
        </header>

        {/* Summary */}
        <div className="mt-4">
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

        {/* Filters */}
        <div className="mt-4">
          <FilterChips
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
            onOpenFilters={() => setFiltersOpen(true)}
            activeCount={activeFilterCount}
          />

          {/* Active summary pills (compact) */}
          {activeFilterCount > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {filters.search.trim() && (
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                >
                  {t('history.filters.chips.search', { value: filters.search.trim() })}
                </button>
              )}
              {filters.account_ids.length > 0 && (
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                >
                  {t('history.filters.chips.accounts', { count: filters.account_ids.length })}
                </button>
              )}
              {filters.category_ids.length > 0 && (
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                >
                  {t('history.filters.chips.categories', { count: filters.category_ids.length })}
                </button>
              )}
              {(filters.min_amount !== undefined || filters.max_amount !== undefined) && (
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                >
                  {t('history.filters.chips.amount', {
                    min: filters.min_amount ?? '…',
                    max: filters.max_amount ?? '…',
                  })}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error for transactions fetch */}
        {txError && (
          <div className="mt-4 rounded-2xl border border-border/50 bg-card/40 p-4">
            <div className="text-sm font-semibold text-foreground">{t('history.errorLoading')}</div>
            <div className="text-sm text-muted-foreground mt-1">{txError}</div>
          </div>
        )}

        {/* List */}
        <div className="mt-4">
          {isInitialLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : showEmpty ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-muted-foreground">
                {selectedFilter === 'all'
                  ? t('common.noTransactions')
                  : selectedFilter === 'income'
                  ? t('history.noIncome')
                  : t('history.noExpense')}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
                  <div key={dateLabel}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                      {dateLabel}
                    </h3>

                    <div className="space-y-2">
                      {txs.map((transaction) => {
                        const category = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
                        const subcategory = transaction.subcategory_id ? subcategoryById.get(transaction.subcategory_id) : undefined;
                        const account = transaction.account_id ? accountById.get(transaction.account_id) : undefined;
                        const isIncome = transaction.type === 'deposit';

                        return (
                          <motion.div
                            key={transaction.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.14 }}
                          >
                            <Card
                              className="border border-border/40 bg-card/40 hover:bg-card/70 transition-colors cursor-pointer active:scale-[0.997]"
                              onClick={() => {
                                hapticSelect();
                                setSelectedTransaction(transaction);
                              }}
                            >
                              <CardContent className="p-3.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div
                                      className={cn(
                                        'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-border/30',
                                        isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
                                      )}
                                    >
                                      <div className="text-xl">
                                        {subcategory?.emoji || category?.emoji || '📌'}
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm text-foreground truncate">
                                        {transaction.note ||
                                          subcategory?.name ||
                                          category?.name ||
                                          (isIncome ? t('common.income') : t('common.expense'))}
                                      </p>

                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        <span className="truncate">{account?.name || t('common.accounts')}</span>
                                        <span>•</span>
                                        <span className="truncate">
                                          {formatDateTime(
                                            transaction.performed_at || transaction.created_at,
                                            user?.timezone,
                                            user?.language_code,
                                            { hour: '2-digit', minute: '2-digit' }
                                          )}
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
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom loading area (SINGLE) */}
              <div className="pt-3">
                {isFetchingNext && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                    ))}
                  </div>
                )}

                {/* Sentinel: ONLY ONCE */}
                <div ref={sentinelRef} className="h-1" />

                {!hasNext && transactions.length > 0 && (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    {t('history.endOfList')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Filters sheet */}
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        accounts={accounts}
        categories={categories}
        value={filters}
        onApply={(v) => {
          hapticSelect();
          setFilters(v);
        }}
      />

      {/* Transaction modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        categories={categories}
        subcategories={subcategories}
        accounts={accounts}
        locale={user?.language_code}
        timezone={user?.timezone}
        onClose={() => setSelectedTransaction(null)}
      />

      <div className="h-safe-bottom" />
    </motion.div>
  );
}

export default HistoryPage;
