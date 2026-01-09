import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';

import { apiClient } from '@/api/client';
import type {
  User,
  Account,
  StatsGroupBy,
  BalanceTimeseriesView,
  CategoryStatsView,
  StatsTxType,
} from '@/core/types';

import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangeSheet, type DateRange } from '@/components/history/DateRangeSheet';
import { AccountFilterSheet } from '@/components/stats/AccountFilterSheet';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ErrorCard } from '@/components/stats/ErrorCard';

import { BalanceTimeseriesChart } from '@/components/stats/BalanceTimeseriesChart';
import { ExploreDonut, type ExploreItem } from '@/components/stats/ExploreDonut';
import { ExploreRankList } from '@/components/stats/ExploreRankList';
import { StatsOverviewCard } from '@/components/stats/StatsOverviewCard';

function toYMD(d: Date) {
  return format(d, 'yyyy-MM-dd');
}
function autoGroupBy(range: DateRange): StatsGroupBy {
  const days = Math.abs(differenceInCalendarDays(range.to, range.from)) + 1;
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

const OTHER_ID = -1;

export default function StatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady, haptic } = useTelegramWebApp();

  // init
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // filters - restore from sessionStorage if available
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const cached = sessionStorage.getItem('stats_dateRange');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          from: new Date(parsed.from),
          to: new Date(parsed.to),
          label: parsed.label,
        };
      } catch {
        // fall through
      }
    }
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now), label: 'thisMonth' };
  });

  const [accountIds, setAccountIds] = useState<string[]>(() => {
    const cached = sessionStorage.getItem('stats_accountIds');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  });

  const groupBy = useMemo(() => autoGroupBy(dateRange), [dateRange]);

  // sheets
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  // balance data
  const [bal, setBal] = useState<BalanceTimeseriesView | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);
  const [errorBal, setErrorBal] = useState<string | null>(null);

  // explore state
  const [txType, setTxType] = useState<StatsTxType>(() => {
    const cached = sessionStorage.getItem('stats_txType');
    return cached === 'deposit' || cached === 'withdrawal' ? cached : 'withdrawal';
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // explore data
  const [cat, setCat] = useState<CategoryStatsView | null>(null);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [errorExplore, setErrorExplore] = useState<string | null>(null);

  const currencyCode = user?.currency_code || 'USD';
  const locale = user?.language_code;

  // Persist filter state to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem(
      'stats_dateRange',
      JSON.stringify({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        label: dateRange.label,
      })
    );
  }, [dateRange]);

  useEffect(() => {
    sessionStorage.setItem('stats_accountIds', JSON.stringify(accountIds));
  }, [accountIds]);

  useEffect(() => {
    sessionStorage.setItem('stats_txType', txType);
  }, [txType]);

  // init load (me + accounts)
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
      type: txType as StatsTxType,
    };
  }, [dateRange.from, dateRange.to, groupBy, accountIds, txType]);

  const debounced = useDebouncedValue(query, 180);

  // ---- fetchers ----
  const fetchBalance = useCallback(
    async (q = debounced) => {
      setLoadingBal(true);
      setErrorBal(null);
      try {
        const res = await apiClient.getStatsBalanceTimeseries({
          from: q.from,
          to: q.to,
          group_by: q.group_by,
          mode: 'aggregate',
          account_ids: q.account_ids,
        });
        setBal(res);
      } catch (e) {
        setErrorBal(
          e instanceof Error ? e.message : (t('stats.trendError') || 'Could not load balance trend')
        );
      } finally {
        setLoadingBal(false);
      }
    },
    [debounced, t]
  );

  const fetchExplore = useCallback(
    async (q = debounced) => {
      setLoadingExplore(true);
      setErrorExplore(null);
      try {
        const res = await apiClient.getStatsByCategory({
          from: q.from,
          to: q.to,
          type: q.type,
          account_ids: q.account_ids,
        });
        setCat(res);
      } catch (e) {
        setErrorExplore(
          e instanceof Error ? e.message : (t('stats.categoriesError') || 'Could not load distribution')
        );
      } finally {
        setLoadingExplore(false);
      }
    },
    [debounced, t]
  );

  // refetch when debounced changes
  useEffect(() => {
    if (!isReady || loadingInit) return;
    fetchBalance(debounced);
    fetchExplore(debounced);
  }, [isReady, loadingInit, debounced, fetchBalance, fetchExplore]);

  // ---- derived donut/list model ----
  const exploreItems: ExploreItem[] = useMemo(() => {
    const items = cat?.items ?? [];
    return items.map((it) => ({
      id: it.category_id,
      name: it.name,
      emoji: it.emoji,
      total: it.total,
      count: it.count,
      share: it.share,
    }));
  }, [cat]);

  const exploreTotals = useMemo(() => {
    return cat?.totals ?? { total: 0, count: 0 };
  }, [cat]);

  // ---- overview metrics ----
  const overviewMetrics = useMemo(() => {
    const totalCount = exploreTotals.count;
    const avgAmount = totalCount > 0 ? exploreTotals.total / totalCount : 0;
    const topCategory = exploreItems.length > 0 ? exploreItems[0] : null;

    return {
      totalCount,
      avgAmount,
      topCategory: topCategory
        ? {
          name: topCategory.name,
          emoji: topCategory.emoji,
          total: topCategory.total,
        }
        : null,
    };
  }, [exploreTotals, exploreItems]);

  // ---- interactions ----
  const onToggleTxType = () => {
    haptic?.selectionChanged?.();
    setTxType((v) => (v === 'withdrawal' ? 'deposit' : 'withdrawal'));
    setSelectedCategoryId(null);
    setExpanded(false);
  };

  // Donut select = highlight only
  const onSelectDonut = (id: number | null) => {
    haptic?.selectionChanged?.();

    if (id == null) {
      setSelectedCategoryId(null);
      return;
    }

    // allow selecting Others for highlight/center label, but it's never navigable
    setSelectedCategoryId(id);
  };

  // Donut drill-down = navigate to category page (ExploreDonut already blocks Others)
  const onDrillDownDonut = (id: number) => {
    if (id === OTHER_ID) return;

    haptic?.impactOccurred?.('light');
    const categoryData = exploreItems.find((it) => it.id === id);

    navigate(`/stats/category/${id}`, {
      state: {
        dateRange: {
          from: dateRange.from,
          to: dateRange.to,
          label: dateRange.label,
        },
        accountIds,
        categoryType: txType,
        categoryMeta: {
          name: categoryData?.name,
          emoji: categoryData?.emoji,
        },
      },
    });
  };

  // List tap = open immediately (as you requested)
  const onSelectFromList = (id: number) => {
    if (id === OTHER_ID) {
      // If list ever includes Others, just select it (no navigation)
      haptic?.selectionChanged?.();
      setSelectedCategoryId(id);
      return;
    }

    haptic?.impactOccurred?.('light');
    const categoryData = exploreItems.find((it) => it.id === id);

    navigate(`/stats/category/${id}`, {
      state: {
        dateRange: {
          from: dateRange.from,
          to: dateRange.to,
          label: dateRange.label,
        },
        accountIds,
        categoryType: txType,
        categoryMeta: {
          name: categoryData?.name,
          emoji: categoryData?.emoji,
        },
      },
    });
  };

  if (!isReady || loadingInit) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-safe-top" />
        <div className="h-14" />
        <div className="px-4 pb-8 max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-4 pb-8 max-w-lg mx-auto">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40 -mx-4 px-4">
          <div className="h-safe-top" />
          <div className="py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold">{t('common.stats') || 'Stats'}</h1>
              </div>

              <button
                onClick={() => setAccountSheetOpen(true)}
                className="px-3 py-2 rounded-xl bg-card/50 hover:bg-card/70 border border-border/50 text-sm font-semibold transition-colors"
              >
                {accountIds.length
                  ? (t('stats.accountCount', { count: accountIds.length }) as string)
                  : (t('common.all') || 'All')}
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
                onClick={onToggleTxType}
                className="h-11 px-4 rounded-2xl border text-sm font-semibold bg-background/40 border-border/50 hover:bg-background/60"
              >
                {txType === 'withdrawal'
                  ? (t('common.expense') || 'Expenses')
                  : (t('common.income') || 'Income')}
              </button>
            </div>
          </div>
        </header>

        {/* Overview Card */}
        <div className="mt-4">
          <StatsOverviewCard
            totalCount={overviewMetrics.totalCount}
            avgAmount={overviewMetrics.avgAmount}
            topCategory={overviewMetrics.topCategory}
            currencyCode={currencyCode}
            locale={locale}
            loading={loadingExplore}
          />
        </div>

        {/* Balance chart */}
        <div className="mt-5">
          {errorBal ? (
            <ErrorCard
              title={t('stats.trendError') || 'Could not load balance trend'}
              message={errorBal}
              onRetry={() => fetchBalance()}
            />
          ) : (
            <BalanceTimeseriesChart
              title={t('stats.balanceOverTime') || 'Balance over time'}
              loading={loadingBal}
              data={bal}
              currencyCode={currencyCode}
              locale={locale}
              groupBy={groupBy}
            />
          )}
        </div>

        {/* Explore donut */}
        <div className="mt-5">
          {errorExplore ? (
            <ErrorCard
              title={t('stats.distributionError') || 'Could not load distribution'}
              message={errorExplore}
              onRetry={() => fetchExplore()}
            />
          ) : (
            <ExploreDonut
              title={
                txType === 'withdrawal'
                  ? (t('stats.topExpenseCategories') || 'Top expense categories')
                  : (t('stats.topIncomeCategories') || 'Top income categories')
              }
              loading={loadingExplore}
              items={exploreItems}
              totals={exploreTotals}
              selectedId={selectedCategoryId}
              onSelect={onSelectDonut}
              onDrillDown={onDrillDownDonut}
              currencyCode={currencyCode}
              locale={locale}
            />
          )}
        </div>

        {/* Explore list (tap once opens page) */}
        <div className="mt-4">
          <ExploreRankList
            title={t('stats.leaders') || 'Leaders'}
            items={exploreItems}
            totals={exploreTotals}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
            selectedId={selectedCategoryId}
            onSelect={onSelectFromList}
            currencyCode={currencyCode}
            locale={locale}
          />
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
