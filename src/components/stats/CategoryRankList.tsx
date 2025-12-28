import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategoryStatsView } from '@/core/types';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function CategoryRankList({
  title,
  loading,
  view,
  currencyCode,
  locale,
  onSelectCategory,
}: {
  title: string;
  loading: boolean;
  view: CategoryStatsView | null;
  currencyCode: string;
  locale?: string;
  onSelectCategory?: (categoryId: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="border border-border/40 bg-card/40">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground">
            {view ? `${view.from} → ${view.to}` : ''}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {loading && !view ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl" />
              ))}
            </>
          ) : !view || !view.items?.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('stats.noCategories')}</div>
          ) : (
            view.items.slice(0, 10).map((it) => {
              const clickable = !!onSelectCategory;
              return (
                <button
                  key={it.category_id}
                  type="button"
                  onClick={() => clickable && onSelectCategory(it.category_id)}
                  className={cn(
                    'w-full text-left rounded-2xl border border-border/40 bg-background/40 px-3 py-3 transition-colors',
                    clickable ? 'hover:bg-background/60 active:scale-[0.995]' : ''
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-muted/30 flex items-center justify-center text-xl">
                        {it.emoji || '📌'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{it.name || t('stats.category')}</div>
                        <div className="text-xs text-muted-foreground">{t('stats.transactions', { count: it.count })}</div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-bold tabular-nums text-sm">
                        {formatCurrency(it.total, currencyCode, locale)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round((it.share || 0) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={cn('h-full bg-primary/70')}
                      style={{ width: `${Math.max(0, Math.min(100, (it.share || 0) * 100))}%` }}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {loading && view ? <div className="mt-3 text-xs text-muted-foreground">{t('stats.updating')}</div> : null}
      </CardContent>
    </Card>
  );
}
