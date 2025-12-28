import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, isAfter, addDays, differenceInCalendarDays, startOfMonth, endOfMonth } from 'date-fns';

import { apiClient } from '@/api/client';
import type { User, Account, TimeseriesStatsView, SubcategoryStatsView } from '@/core/types';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { DateRangeSheet, type DateRange } from '@/components/history/DateRangeSheet';
import { AccountFilterSheet } from '@/components/stats/AccountFilterSheet';
import { TimeseriesChart } from '@/components/stats/TimeseriesChart';
import { SubcategoryRankList } from '@/components/stats/SubcategoryRankList';
import { ErrorCard } from '@/components/stats/ErrorCard';

type GroupBy = 'day' | 'week' | 'month';
type CatType = 'deposit' | 'withdrawal';

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function toYMD(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function autoGroupBy(range: DateRange): GroupBy {
  const days = Math.abs(differenceInCalendarDays(range.to, range.from)) + 1;
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

function shiftRange(range: DateRange, direction: 'prev' | 'next'): DateRange {
  const days = differenceInCalendarDays(range.to, range.from) + 1;
  const delta = direction === 'prev' ? -days : days;
  return { from: addDays(range.from, delta), to: addDays(range.to, delta), label: 'custom' };
}

type NavState = {
  dateRange?: DateRange;
  accountIds?: string[];
  categoryType?: CatType;
  categoryMeta?: { name?: string; emoji?: string };
};

export default function CategoryStatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady, haptic } = useTelegramWebApp();
  const { categoryId } = useParams();
  const location = useLocation();

  const catId = Number(categoryId);
  const navState = (location.state || {}) as NavState;

  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (navState.dateRange?.from && navState.dateRange?.to) return navState.dateRange;
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now), label: 'thisMonth' };
  });

  const [accountIds, setAccountIds] = useState<string[]>(navState.accountIds || []);
  const [categoryType, setCategoryType] = useState<CatType>(navState.categoryType || 'withdrawal');

  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  const [tsData, setTsData] = useState<TimeseriesStatsView | null>(null);
  const [subData, setSubData] = useState<SubcategoryStatsView | null>(null);

  const [loadingTs, setLoadingTs] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  const [errorTs, setErrorTs] = useState<string | null>(null);
  const [errorSub, setErrorSub] = useState<string | null>(null);

  const currencyCode = user?.currency_code || 'USD';
  const locale = user?.language_code;

  const groupBy = useMemo(() => autoGroupBy(dateRange), [dateRange]);

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

  const query = useMemo(() => {
    return {
      from: toYMD(dateRange.from),
      to: toYMD(dateRange.to),
      group_by: groupBy,
      account_ids: accountIds.length ? accountIds : undefined,
      category_ids: [catId],
      categoryType,
      ts_type: categoryType === 'deposit' ? ('deposit' as const) : ('withdrawal' as const),
    };
  }, [dateRange.from, dateRange.to, groupBy, accountIds, catId, categoryType]);

  const debouncedQuery = useDebouncedValue(query, 180);

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
        category_ids: q.category_ids,
      });
      setTsData(res);
    } catch (e) {
      setErrorTs(e instanceof Error ? e.message : 'Failed to load trend');
    } finally {
      setLoadingTs(false);
    }
  }, [debouncedQuery]);

  const fetchSubcategories = useCallback(async (q = debouncedQuery) => {
    setLoadingSub(true);
    setErrorSub(null);
    try {
      const res = await apiClient.getStatsBySubcategory({
        from: q.from,
        to: q.to,
        type: q.categoryType,
        account_ids: q.account_ids,
        category_ids: q.category_ids,
      });
      setSubData(res);
    } catch (e) {
      setErrorSub(e instanceof Error ? e.message : 'Failed to load subcategories');
    } finally {
      setLoadingSub(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (!isReady || loadingInit || !Number.isFinite(catId)) return;
    fetchTimeseries(debouncedQuery);
    fetchSubcategories(debouncedQuery);
  }, [isReady, loadingInit, catId, debouncedQuery, fetchTimeseries, fetchSubcategories]);

  const onPrev = () => {
    haptic?.impactOccurred?.('light');
    setDateRange((r) => shiftRange(r, 'prev'));
  };

  const onNext = () => {
    haptic?.impactOccurred?.('light');
    setDateRange((r) => shiftRange(r, 'next'));
  };

  const canGoNext = () => {
    const next = shiftRange(dateRange, 'next');
    return !isAfter(next.to, new Date());
  };

  const titleName = navState.categoryMeta?.name || t('stats.category') || 'Category';
  const titleEmoji = navState.categoryMeta?.emoji || '📌';

  if (!Number.isFinite(catId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-muted-foreground">
        Invalid category id
      </div>
    );
  }

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
        <header className="pt-2 pb-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{t('common.back')}</span>
          </button>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">{categoryType === 'deposit' ? (t('common.income') || 'Income') : (t('common.expense') || 'Expenses')}</div>
              <h1 className="text-xl font-bold truncate">
                <span className="mr-2">{titleEmoji}</span>
                {titleName}
              </h1>
            </div>

            <button
              onClick={() => setAccountSheetOpen(true)}
              className="px-3 py-2 rounded-xl bg-card/50 hover:bg-card/70 border border-border/50 text-sm font-semibold transition-colors"
            >
              {accountIds.length ? `${accountIds.length} acc` : (t('common.all') || 'All')}
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setDateSheetOpen(true)}
              className="flex-1 h-11 rounded-2xl bg-card/50 hover:bg-card/70 border border-border/50 text-sm font-semibold transition-colors"
            >
              {toYMD(dateRange.from)} → {toYMD(dateRange.to)}
            </button>

            <button
              onClick={() => setCategoryType((v) => (v === 'withdrawal' ? 'deposit' : 'withdrawal'))}
              className={cn(
                'h-11 px-4 rounded-2xl border text-sm font-semibold transition-colors',
                categoryType === 'withdrawal'
                  ? 'bg-background/40 border-border/50 text-foreground'
                  : 'bg-primary/10 border-primary/30 text-foreground'
              )}
            >
              {categoryType === 'withdrawal' ? (t('common.expense') || 'Expense') : (t('common.income') || 'Income')}
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={onPrev}
              className="flex-1 h-11 rounded-2xl bg-background/40 border border-border/50 text-sm font-semibold"
            >
              ← {t('common.prev') || 'Prev'}
            </button>
            <button
              onClick={onNext}
              disabled={!canGoNext()}
              className={cn(
                'flex-1 h-11 rounded-2xl border text-sm font-semibold',
                canGoNext()
                  ? 'bg-background/40 border-border/50 text-foreground'
                  : 'bg-muted/30 border-border/30 text-muted-foreground opacity-60 cursor-not-allowed'
              )}
            >
              {t('common.next') || 'Next'} →
            </button>
          </div>
        </header>

        <div className="mt-2">
          {errorTs ? (
            <ErrorCard title="Could not load trend" message={errorTs} onRetry={() => fetchTimeseries()} />
          ) : (
            <TimeseriesChart
              title={t('stats.trend') || 'Trend'}
              loading={loadingTs}
              data={tsData}
              currencyCode={currencyCode}
              locale={locale}
              groupBy={groupBy}
            />
          )}
        </div>

        <div className="mt-5">
          {errorSub ? (
            <ErrorCard title="Could not load subcategories" message={errorSub} onRetry={() => fetchSubcategories()} />
          ) : (
            <SubcategoryRankList
              title={t('stats.topSubcategories') || 'Top subcategories'}
              loading={loadingSub}
              view={subData}
              currencyCode={currencyCode}
              locale={locale}
              onSelectSubcategory={(subcategoryId) => {
                  const meta = subData?.items?.find((x) => x.subcategory_id === subcategoryId);
                  navigate(`/stats/subcategory/${subcategoryId}`, {
                  state: {
                      dateRange,
                      accountIds,
                      categoryType,
                      categoryId: catId,
                      subcategoryMeta: { name: meta?.name, emoji: meta?.emoji },
                  },
                  });
              }}
            />
          )}
        </div>

        <div className="mt-5">
          <button
            onClick={() => {
              // You likely have /history. This passes state for your history page to use.
              navigate('/history', {
                state: {
                  from: dateRange.from.toISOString(),
                  to: dateRange.to.toISOString(),
                  type: categoryType === 'deposit' ? 'deposit' : 'withdrawal',
                  category_ids: [catId],
                  account_ids: accountIds.length ? accountIds : undefined,
                },
              });
            }}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.99] transition-transform shadow-lg shadow-primary/20"
          >
            {t('stats.viewTransactions') || 'View transactions'}
          </button>
        </div>
      </div>

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
