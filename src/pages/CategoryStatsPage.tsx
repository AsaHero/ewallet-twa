import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

import { apiClient } from '@/api/client';
import type { User, SubcategoryStatsView } from '@/core/types';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

import { SubcategoryRankList } from '@/components/stats/SubcategoryRankList';
import { ExploreDonut, type ExploreItem } from '@/components/stats/ExploreDonut';
import { ErrorCard } from '@/components/stats/ErrorCard';
import type { DateRange } from '@/components/history/DateRangeSheet';

type CatType = 'deposit' | 'withdrawal';

function toYMD(d: Date) {
  return format(d, 'yyyy-MM-dd');
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
  const { isReady } = useTelegramWebApp();
  const { loading: authLoading } = useAuth();
  const { categoryId } = useParams();
  const location = useLocation();

  const catId = Number(categoryId);
  const navState = (location.state || {}) as NavState;

  // Filters from navigation state (read-only)
  const dateRange = navState.dateRange || { from: new Date(), to: new Date(), label: 'custom' as const };
  const accountIds = navState.accountIds || [];
  const categoryType = navState.categoryType || 'withdrawal';

  const [user, setUser] = useState<User | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  const [subData, setSubData] = useState<SubcategoryStatsView | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [errorSub, setErrorSub] = useState<string | null>(null);

  const currencyCode = user?.currency_code || 'USD';
  const locale = user?.language_code;

  useEffect(() => {
    if (!isReady || authLoading) return;
    (async () => {
      try {
        const me = await apiClient.getMe();
        setUser(me);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, [isReady, authLoading]);

  const fetchSubcategories = useCallback(async () => {
    setLoadingSub(true);
    setErrorSub(null);
    try {
      const res = await apiClient.getStatsBySubcategory({
        from: toYMD(dateRange.from),
        to: toYMD(dateRange.to),
        type: categoryType,
        account_ids: accountIds.length ? accountIds : undefined,
        category_ids: [catId],
      });
      setSubData(res);
    } catch (e) {
      setErrorSub(e instanceof Error ? e.message : t('stats.subcategoriesError'));
    } finally {
      setLoadingSub(false);
    }
  }, [dateRange, catId, categoryType, accountIds, t]);

  useEffect(() => {
    if (!isReady || loadingInit || !Number.isFinite(catId)) return;
    fetchSubcategories();
  }, [isReady, loadingInit, catId, fetchSubcategories]);

  // TWA BackButton
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.show();
    const handler = () => navigate(-1);
    tg.BackButton.onClick(handler);

    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(handler);
    };
  }, [navigate]);

  // Donut chart data
  const donutItems: ExploreItem[] = useMemo(() => {
    const items = subData?.items ?? [];
    return items.map((it) => ({
      id: it.subcategory_id ?? -1, // Use -1 for null
      name: it.name || t('stats.uncategorized'),
      emoji: it.emoji || '📌',
      total: it.total,
      count: it.count,
      share: it.share,
    }));
  }, [subData, t]);

  const titleName = navState.categoryMeta?.name || t('stats.category') || 'Category';
  const titleEmoji = navState.categoryMeta?.emoji || '📌';

  if (!Number.isFinite(catId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-muted-foreground">
        {t('stats.invalidCategoryId')}
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
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const accountCount = accountIds.length;
  const dateStr = `${toYMD(dateRange.from)} → ${toYMD(dateRange.to)}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="h-safe-top" />
      <div className="h-14" />

      <div className="px-4 pb-8 max-w-md mx-auto">
        <header className="pt-2 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">
                {categoryType === 'deposit' ? (t('common.income') || 'Income') : (t('common.expense') || 'Expenses')}
              </div>
              <h1 className="text-xl font-bold truncate">
                <span className="mr-2">{titleEmoji}</span>
                {titleName}
              </h1>
            </div>
          </div>

          {/* Filter display (read-only) */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              📅 {dateStr}
            </div>
            {accountCount > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                👥 {t('stats.accountCount', { count: accountCount })}
              </div>
            )}
          </div>
        </header>

        {/* Donut Chart */}
        <div className="mt-2">
          <ExploreDonut
            title={t('stats.distribution') || 'Distribution'}
            loading={loadingSub}
            items={donutItems}
            totals={subData?.totals ?? { total: 0, count: 0 }}
            selectedId={null}
            currencyCode={currencyCode}
            locale={locale}
          />
        </div>

        {/* Subcategory List */}
        <div className="mt-5">
          {errorSub ? (
            <ErrorCard
              title={t('stats.subcategoriesError')}
              message={errorSub}
              onRetry={() => fetchSubcategories()}
            />
          ) : (
            <SubcategoryRankList
              title={t('stats.topSubcategories') || 'Top subcategories'}
              loading={loadingSub}
              view={subData}
              currencyCode={currencyCode}
              locale={locale}
              onSelectSubcategory={(subcategoryId) => {
                // Navigate to History page with filters
                navigate('/history', {
                  state: {
                    from: dateRange.from.toISOString(),
                    to: dateRange.to.toISOString(),
                    type: categoryType === 'deposit' ? 'deposit' : 'withdrawal',
                    category_ids: [catId],
                    subcategory_ids: subcategoryId === null ? undefined : [subcategoryId],
                    account_ids: accountIds.length ? accountIds : undefined,
                  },
                });
              }}
            />
          )}
        </div>

        {/* View All Transactions */}
        <div className="mt-5">
          <button
            onClick={() => {
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

      <div className="h-safe-bottom" />
    </div>
  );
}
