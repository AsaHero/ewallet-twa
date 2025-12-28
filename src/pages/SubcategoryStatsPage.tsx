import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
import type { User, Account, StatsGroupBy, StatsTxType, TimeseriesStatsView } from '@/core/types';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { DateRangeSheet, type DateRange } from '@/components/history/DateRangeSheet';
import { AccountFilterSheet } from '@/components/stats/AccountFilterSheet';
import { TimeseriesChart } from '@/components/stats/TimeseriesChart';
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
  return { from: addDays(range.from, delta), to: addDays(range.to, delta), label: 'custom' };
}

type NavState = {
  dateRange?: DateRange;
  accountIds?: string[];
  categoryType?: StatsTxType;
  categoryId?: number;
  subcategoryMeta?: { name?: string; emoji?: string };
};

export default function SubcategoryStatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady, haptic } = useTelegramWebApp();
  const { subcategoryId } = useParams();
  const location = useLocation();

  const subId = Number(subcategoryId);
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
  const [txType, setTxType] = useState<StatsTxType>(navState.categoryType || 'withdrawal');

  const groupBy = useMemo(() => autoGroupBy(dateRange), [dateRange]);

  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  const [tsData, setTsData] = useState<TimeseriesStatsView | null>(null);
  const [loadingTs, setLoadingTs] = useState(false);
  const [errorTs, setErrorTs] = useState<string | null>(null);

  const currencyCode = user?.currency_code || 'USD';
  const locale = user?.language_code;

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
      type: txType as any,
      account_ids: accountIds.length ? accountIds : undefined,
      subcategory_ids: [subId],
      // Optional: keep category_id too if you want extra-safety narrowing
      category_ids: navState.categoryId ? [navState.categoryId] : undefined,
    };
  }, [dateRange.from, dateRange.to, groupBy, txType, accountIds, subId, navState.categoryId]);

  const debouncedQuery = useDebouncedValue(query, 180);

  const fetchTimeseries = useCallback(async (q = debouncedQuery) => {
    setLoadingTs(true);
    setErrorTs(null);
    try {
      const res = await apiClient.getStatsTimeseries({
        from: q.from,
        to: q.to,
        group_by: q.group_by,
        type: q.type,
        account_ids: q.account_ids,
        category_ids: q.category_ids,
        subcategory_ids: q.subcategory_ids, // ✅ NEW
      });
      setTsData(res);
    } catch (e) {
      setErrorTs(e instanceof Error ? e.message : t('stats.trendError'));
    } finally {
      setLoadingTs(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (!isReady || loadingInit || !Number.isFinite(subId)) return;
    fetchTimeseries(debouncedQuery);
  }, [isReady, loadingInit, subId, debouncedQuery, fetchTimeseries]);

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

  const titleName = navState.subcategoryMeta?.name || t('stats.subcategory') || 'Subcategory';
  const titleEmoji = navState.subcategoryMeta?.emoji || '📌';

  if (!Number.isFinite(subId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-muted-foreground">
        {t('stats.invalidSubcategoryId')}
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
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
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
              <div className="text-sm text-muted-foreground">
                {txType === 'deposit' ? (t('common.income') || 'Income') : (t('common.expense') || 'Expenses')}
              </div>
              <h1 className="text-xl font-bold truncate">
                <span className="mr-2">{titleEmoji}</span>
                {titleName}
              </h1>
            </div>

            <button
              onClick={() => setAccountSheetOpen(true)}
              className="px-3 py-2 rounded-xl bg-card/50 hover:bg-card/70 border border-border/50 text-sm font-semibold transition-colors"
            >
              {accountIds.length ? t('stats.accountCount', { count: accountIds.length }) : (t('common.all') || 'All')}
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
              onClick={() => setTxType((v) => (v === 'withdrawal' ? 'deposit' : 'withdrawal'))}
              className={cn(
                'h-11 px-4 rounded-2xl border text-sm font-semibold transition-colors',
                txType === 'withdrawal'
                  ? 'bg-background/40 border-border/50 text-foreground'
                  : 'bg-primary/10 border-primary/30 text-foreground'
              )}
            >
              {txType === 'withdrawal' ? (t('common.expense') || 'Expense') : (t('common.income') || 'Income')}
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
            <ErrorCard
              title={t('stats.trendError')}
              message={errorTs}
              onRetry={() => fetchTimeseries()}
            />
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
          <button
            onClick={() => {
              navigate('/history', {
                state: {
                  from: dateRange.from.toISOString(),
                  to: dateRange.to.toISOString(),
                  type: txType,
                  subcategory_ids: [subId],
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
