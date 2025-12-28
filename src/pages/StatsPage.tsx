import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  format,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  addDays,
  isAfter,
} from 'date-fns';

import { apiClient } from '@/api/client';
import type { User, Account, TimeseriesStatsView, CategoryStatsView, StatsGroupBy } from '@/core/types';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { Skeleton } from '@/components/ui/skeleton';

import { SummaryCard } from '@/components/history/SummaryCard';
import { DateRangeSheet, type DateRange } from '@/components/history/DateRangeSheet';
import { StatsTypeChips, type StatsType } from '@/components/stats/StatsTypeChips';
import { AccountFilterSheet } from '@/components/stats/AccountFilterSheet';
import { TimeseriesChart } from '@/components/stats/TimeseriesChart';
import { CategoryRankList } from '@/components/stats/CategoryRankList';
import { ErrorCard } from '@/components/stats/ErrorCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function toYMD(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function autoGroupBy(range: DateRange): StatsGroupBy {
  const days = Math.abs(differenceInCalendarDays(range.to, range.from)) + 1;
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

function shiftRange(range: DateRange, direction: 'prev' | 'next'): DateRange {
  const days = differenceInCalendarDays(range.to, range.from) + 1;
  const delta = direction === 'prev' ? -days : days;
  return {
    from: addDays(range.from, delta),
    to: addDays(range.to, delta),
    label: 'custom',
  };
}

export default function StatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady, haptic } = useTelegramWebApp();

  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now), label: 'thisMonth' };
  });

  const [type, setType] = useState<StatsType>('all'); // all | income | expense
  const [accountIds, setAccountIds] = useState<string[]>([]); // empty = all

  // Sheets
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  // Data
  const [tsData, setTsData] = useState<TimeseriesStatsView | null>(null);
  const [catData, setCatData] = useState<CategoryStatsView | null>(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTs, setLoadingTs] = useState(false);
  const [loadingCat, setLoadingCat] = useState(false);

  const [errorTs, setErrorTs] = useState<string | null>(null);
  const [errorCat, setErrorCat] = useState<string | null>(null);

  const currencyCode = user?.currency_code || 'USD';
  const locale = user?.language_code;

  const groupBy = useMemo(() => autoGroupBy(dateRange), [dateRange]);

  // Map UI type -> backend type for timeseries
  const timeseriesType = useMemo(() => {
    if (type === 'income') return 'deposit' as const;
    if (type === 'expense') return 'withdrawal' as const;
    return undefined;
  }, [type]);

  // For categories: if "all" we still show expense categories (more useful).
  const categoryType = useMemo(() => {
    if (type === 'income') return 'deposit' as const;
    return 'withdrawal' as const;
  }, [type]);

  // Build request query (server expects repeated keys for arrays: account_ids=...&account_ids=...)
  const query = useMemo(() => {
    return {
      from: toYMD(dateRange.from),
      to: toYMD(dateRange.to),
      group_by: groupBy,
      ts_type: timeseriesType,
      cat_type: categoryType,
      account_ids: accountIds.length ? accountIds : undefined,
    };
  }, [dateRange.from, dateRange.to, groupBy, timeseriesType, categoryType, accountIds]);

  const debouncedQuery = useDebouncedValue(query, 180);

  // Initial data (me + accounts)
  useEffect(() => {
    if (!isReady) return;

    (async () => {
      try {
        const [me, acc] = await Promise.all([apiClient.getMe(), apiClient.getAccounts()]);
        setUser(me);
        setAccounts(acc);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, [isReady]);

  const fetchTimeseries = useCallback(async (q = debouncedQuery) => {
    setLoadingTs(true);
    setErrorTs(null);
    try {
      const res = await apiClient.getStatsTimeseries({
        from: q.from,
        to: q.to,
        group_by: q.group_by,
        type: q.ts_type,
        account_ids: q.account_ids,
      });
      setTsData(res);
    } catch (e) {
      setErrorTs(e instanceof Error ? e.message : 'Failed to load trend');
    } finally {
      setLoadingTs(false);
    }
  }, [debouncedQuery]);

  const fetchCategories = useCallback(async (q = debouncedQuery) => {
    setLoadingCat(true);
    setErrorCat(null);
    try {
      const res = await apiClient.getStatsByCategory({
        from: q.from,
        to: q.to,
        type: q.cat_type,
        account_ids: q.account_ids,
      });
      setCatData(res);
    } catch (e) {
      setErrorCat(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoadingCat(false);
    }
  }, [debouncedQuery]);

  // Refetch on debounced changes
  useEffect(() => {
    if (!isReady || loadingInit) return;
    fetchTimeseries(debouncedQuery);
    fetchCategories(debouncedQuery);
  }, [isReady, loadingInit, debouncedQuery, fetchTimeseries, fetchCategories]);

  const totals = tsData?.totals;

  const onPrev = () => {
    haptic?.impactOccurred?.('light');
    setDateRange((r) => shiftRange(r, 'prev'));
  };

  const onNext = () => {
    haptic?.impactOccurred?.('light');
    setDateRange((r) => shiftRange(r, 'next'));
  };

  const canGoNext = () => {
    // prevent going into future: if next shift would result in to > now => disable
    const next = shiftRange(dateRange, 'next');
    return !isAfter(next.to, new Date());
  };

  const accountLabel = useMemo(() => {
    if (!accountIds.length) return t('common.all') || 'All';
    if (accountIds.length === 1) {
      const a = accounts.find((x) => x.id === accountIds[0]);
      return a?.name || '1 account';
    }
    return `${accountIds.length} accounts`;
  }, [accountIds, accounts, t]);

  if (!isReady || loadingInit) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-safe-top" />
        <div className="h-14" />
        <div className="px-4 pb-8 max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="h-safe-top" />
      <div className="h-14" />

      <div className="px-4 pb-8 max-w-md mx-auto">
        {/* Sticky header + controls */}
        <header className="pt-2 pb-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{t('common.backToHome')}</span>
          </button>

          <div className="mt-3 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold">{t('common.stats') || 'Stats'}</h1>

            <button
              onClick={() => setAccountSheetOpen(true)}
              className="px-3 py-2 rounded-xl bg-card/50 hover:bg-card/70 border border-border/50 text-sm font-semibold transition-colors"
            >
              {accountLabel}
            </button>
          </div>

          <div className="mt-3">
            <StatsTypeChips
              value={type}
              onChange={(v) => {
                haptic?.selectionChanged?.();
                setType(v);
              }}
            />
          </div>
        </header>

        {/* KPI Summary */}
        <div className="mt-2">
          <SummaryCard
            dateRange={dateRange}
            totalIncome={totals?.income ?? 0}
            totalExpense={totals?.expense ?? 0}
            currencyCode={currencyCode}
            locale={locale}
            onPrev={onPrev}
            onNext={onNext}
            canGoPrev
            canGoNext={canGoNext()}
            onHeaderClick={() => setDateSheetOpen(true)}
          />
        </div>

        {/* Trend */}
        <div className="mt-5">
          {errorTs ? (
            <ErrorCard
              title={t('stats.trendError') || 'Could not load trend'}
              message={errorTs}
              onRetry={() => fetchTimeseries()}
            />
          ) : (
            <TimeseriesChart
              loading={loadingTs}
              data={tsData}
              currencyCode={currencyCode}
              locale={locale}
              groupBy={groupBy}
              title={t('stats.trend') || 'Trend'}
            />
          )}
        </div>

        {/* Categories */}
        <div className="mt-5">
          {errorCat ? (
            <ErrorCard
              title={t('stats.categoriesError') || 'Could not load categories'}
              message={errorCat}
              onRetry={() => fetchCategories()}
            />
          ) : (
            <CategoryRankList
              loading={loadingCat}
              view={catData}
              currencyCode={currencyCode}
              locale={locale}
              title={
                  type === 'income'
                  ? (t('stats.topIncomeCategories') || 'Top income categories')
                  : (t('stats.topExpenseCategories') || 'Top expense categories')
              }
              onSelectCategory={(categoryId) => {
                  // find meta for nicer header
                  const meta = catData?.items?.find((x) => x.category_id === categoryId);
                  navigate(`/stats/category/${categoryId}`, {
                  state: {
                      dateRange,
                      accountIds,
                      categoryType: type === 'income' ? 'deposit' : 'withdrawal',
                      categoryMeta: { name: meta?.name, emoji: meta?.emoji },
                  },
                  });
              }}
            />
          )}
        </div>
      </div>

      {/* Sheets */}
      <DateRangeSheet
        open={dateSheetOpen}
        onOpenChange={setDateSheetOpen}
        value={dateRange}
        onApply={(v) => setDateRange(v)}
      />

      <AccountFilterSheet
        open={accountSheetOpen}
        onOpenChange={setAccountSheetOpen}
        accounts={accounts}
        selectedIds={accountIds}
        onApply={(ids) => setAccountIds(ids)}
        title={t('stats.accounts') || 'Accounts'}
      />

      <div className="h-safe-bottom" />
    </div>
  );
}
