import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCompactNumber, formatPercentChange, getTrendIcon } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface StatsOverviewCardProps {
  totalCount: number;
  avgAmount: number;
  topCategory: { name: string; emoji?: string; total: number } | null;
  periodChange?: number; // percentage change from previous period
  currencyCode: string;
  locale?: string;
  loading?: boolean;
}

function StatItem({
  label,
  value,
  trend,
  icon,
  loading = false
}: {
  label: string;
  value: string;
  trend?: { value: number; label: string };
  icon?: string;
  loading?: boolean;
}) {
  const trendIcon = trend ? getTrendIcon(trend.value) : null;
  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-base">{icon}</span>}
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <>
          <div className="text-lg font-bold tabular-nums">{value}</div>
          {trend && trend.value !== 0 && (
            <div className={cn(
              "text-[10px] font-semibold flex items-center gap-0.5",
              isPositive && "text-green-600 dark:text-green-400",
              isNegative && "text-red-600 dark:text-red-400",
              !isPositive && !isNegative && "text-muted-foreground"
            )}>
              <span>{trendIcon}</span>
              <span>{formatPercentChange(Math.abs(trend.value))}</span>
              <span className="text-muted-foreground ml-0.5">{trend.label}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function StatsOverviewCard({
  totalCount,
  avgAmount,
  topCategory,
  periodChange,
  currencyCode,
  locale,
  loading = false,
}: StatsOverviewCardProps) {
  const { t } = useTranslation();

  const avgFormatted = useMemo(
    () => formatCurrency(avgAmount, currencyCode, locale),
    [avgAmount, currencyCode, locale]
  );

  const topCategoryFormatted = useMemo(
    () => topCategory ? formatCurrency(topCategory.total, currencyCode, locale) : '-',
    [topCategory, currencyCode, locale]
  );

  return (
    <Card className="border border-border/40 bg-card/40 overflow-hidden">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {t('stats.overview') || 'Overview'}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <StatItem
            label={t('stats.totalTransactions') || 'Total Transactions'}
            value={formatCompactNumber(totalCount, locale)}
            trend={periodChange !== undefined ? {
              value: periodChange,
              label: t('stats.periodChange') || 'vs last'
            } : undefined}
            icon="📊"
            loading={loading}
          />

          <StatItem
            label={t('stats.avgTransaction') || 'Avg Transaction'}
            value={loading ? '-' : avgFormatted}
            icon="💰"
            loading={loading}
          />

          {topCategory ? (
            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl flex-shrink-0">{topCategory.emoji || '📌'}</span>
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {t('stats.topCategory') || 'Top Category'}
                  </div>
                  <div className="text-sm font-semibold truncate">{topCategory.name}</div>
                </div>
              </div>
              <div className="text-sm font-bold tabular-nums flex-shrink-0 ml-2">
                {loading ? '-' : topCategoryFormatted}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
