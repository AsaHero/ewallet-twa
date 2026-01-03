import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';

import { apiClient } from '@/api/client';
import type {
  User,
  Account,
  StatsGroupBy,
  BalanceTimeseriesView,
  CategoryStatsView,
  SubcategoryStatsView,
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

type ExploreLevel = 'category' | 'subcategory';

function toYMD(d: Date) {
  return format(d, 'yyyy-MM-dd');
}
function autoGroupBy(range: DateRange): StatsGroupBy {
  const days = Math.abs(differenceInCalendarDays(range.to, range.from)) + 1;
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

export default function StatsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady, haptic } = useTelegramWebApp();

  // init
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // filters
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now), label: 'thisMonth' };
  });
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const groupBy = useMemo(() => autoGroupBy(dateRange), [dateRange]);

  // sheets
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  // balance data
  const [bal, setBal] = useState<BalanceTimeseriesView | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);
  const [errorBal, setErrorBal] = useState<string | null>(null);

  // explore state
  const [txType, setTxType] = useState<StatsTxType>('withdrawal');
  const [level, setLevel] = useState<ExploreLevel>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // explore data
  const [cat, setCat] = useState<CategoryStatsView | null>(null);
  const [sub, setSub] = useState<SubcategoryStatsView | null>(null);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [errorExplore, setErrorExplore] = useState<string | null>(null);

  const currencyCode = user?.currency_code || 'USD';
  const locale = user?.language_code;

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
      txType,
      level,
      selectedCategoryId,
    };
  }, [dateRange.from, dateRange.to, groupBy, accountIds, txType, level, selectedCategoryId]);

  const debounced = useDebouncedValue(query, 180);

  // ---- fetchers ----
  const fetchBalance = useCallback(async (q = debounced) => {
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
      setErrorBal(e instanceof Error ? e.message : (t('stats.trendError') || 'Could not load balance trend'));
    } finally {
      setLoadingBal(false);
    }
  }, [debounced, t]);

  const fetchExplore = useCallback(async (q = debounced) => {
    setLoadingExplore(true);
    setErrorExplore(null);

    try {
      if (q.level === 'category') {
        const res = await apiClient.getStatsByCategory({
          from: q.from,
          to: q.to,
          type: q.txType,
          account_ids: q.account_ids,
        });
        setCat(res);
        setSub(null);
      } else {
        if (!q.selectedCategoryId) {
          // safety fallback
          const res = await apiClient.getStatsByCategory({
            from: q.from,
            to: q.to,
            type: q.txType,
            account_ids: q.account_ids,
          });
          setCat(res);
          setSub(null);
          return;
        }

        const res = await apiClient.getStatsBySubcategory({
          from: q.from,
          to: q.to,
          type: q.txType,
          account_ids: q.account_ids,
          category_ids: [q.selectedCategoryId],
        });
        setSub(res);
      }
    } catch (e) {
      setErrorExplore(e instanceof Error ? e.message : (t('stats.categoriesError') || 'Could not load distribution'));
    } finally {
      setLoadingExplore(false);
    }
  }, [debounced, t]);

  // refetch when debounced changes
  useEffect(() => {
    if (!isReady || loadingInit) return;
    fetchBalance(debounced);
    fetchExplore(debounced);
  }, [isReady, loadingInit, debounced, fetchBalance, fetchExplore]);

  // ---- derived donut/list model ----
  const exploreItems: ExploreItem[] = useMemo(() => {
    if (level === 'category') {
      const items = cat?.items ?? [];
      return items.map((it) => ({
        id: it.category_id,
        name: it.name,
        emoji: it.emoji,
        total: it.total,
        count: it.count,
        share: it.share,
      }));
    }
    const items = sub?.items ?? [];
    return items.map((it) => ({
      id: it.subcategory_id,
      name: it.name,
      emoji: it.emoji,
      total: it.total,
      count: it.count,
      share: it.share,
    }));
  }, [level, cat, sub]);

  const exploreTotals = useMemo(() => {
    if (level === 'category') return cat?.totals ?? { total: 0, count: 0 };
    return sub?.totals ?? { total: 0, count: 0 };
  }, [level, cat, sub]);

  const selectedId = level === 'category' ? selectedCategoryId : selectedSubId;

  // ---- overview metrics ----
  const overviewMetrics = useMemo(() => {
    const totalCount = exploreTotals.count;
    const avgAmount = totalCount > 0 ? exploreTotals.total / totalCount : 0;
    const topCategory = exploreItems.length > 0 ? exploreItems[0] : null;

    return {
      totalCount,
      avgAmount,
      topCategory: topCategory ? {
        name: topCategory.name,
        emoji: topCategory.emoji,
        total: topCategory.total,
      } : null,
    };
  }, [exploreTotals, exploreItems]);

  // ---- interactions ----
  const onToggleTxType = () => {
    haptic?.selectionChanged?.();
    setTxType((v) => (v === 'withdrawal' ? 'deposit' : 'withdrawal'));
    // reset drill
    setLevel('category');
    setSelectedCategoryId(null);
    setSelectedSubId(null);
    setExpanded(false);
  };

  const onSelectExplore = (id: number) => {
    haptic?.impactOccurred?.('light');

    if (level === 'category') {
      // Navigate to CategoryStatsPage with all filter state
      const categoryData = exploreItems.find(it => it.id === id);

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
    } else {
      // select subcategory
      setSelectedSubId(id);
    }
  };

  const onBackToCategories = () => {
    haptic?.selectionChanged?.();
    setLevel('category');
    setSelectedCategoryId(null);
    setSelectedSubId(null);
    setExpanded(false);
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
      <div className="h-safe-top" />
      <div className="h-14" />

      <div className="px-4 pb-8 max-w-md mx-auto">
        {/* Sticky header */}
        <header className="pt-2 pb-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
          <div className="mt-3 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold">{t('common.stats') || 'Stats'}</h1>

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
              onClick={onToggleTxType}
              className="h-11 px-4 rounded-2xl border text-sm font-semibold bg-background/40 border-border/50 hover:bg-background/60"
            >
              {txType === 'withdrawal' ? (t('common.expense') || 'Expenses') : (t('common.income') || 'Income')}
            </button>
          </div>

          {level === 'subcategory' ? (
            <div className="mt-3">
              <button
                onClick={onBackToCategories}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← {t('stats.allCategories') || 'All categories'}
              </button>
            </div>
          ) : null}
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
                level === 'category'
                  ? (txType === 'withdrawal' ? (t('stats.topExpenseCategories') || 'Top expense categories') : (t('stats.topIncomeCategories') || 'Top income categories'))
                  : (t('stats.topSubcategories') || 'Top subcategories')
              }
              loading={loadingExplore}
              items={exploreItems}
              totals={exploreTotals}
              selectedId={selectedId}
              onSelect={onSelectExplore}
              currencyCode={currencyCode}
              locale={locale}
            />
          )}
        </div>

        {/* Explore list */}
        <div className="mt-4">
          <ExploreRankList
            title={level === 'category' ? (t('stats.leaders') || 'Leaders') : (t('stats.leaders') || 'Leaders')}
            items={exploreItems}
            totals={exploreTotals}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
            selectedId={selectedId}
            onSelect={onSelectExplore}
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
