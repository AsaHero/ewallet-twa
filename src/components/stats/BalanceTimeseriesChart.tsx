import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import type { BalanceTimeseriesView, StatsGroupBy } from '@/core/types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { EmptyStateIllustration } from './EmptyStateIllustration';

function shortLabel(ts: string, groupBy: StatsGroupBy) {
  if (!ts) return '';
  if (groupBy === 'month') return ts.slice(0, 7); // YYYY-MM
  return ts.slice(5, 10); // MM-DD
}

function estimateTickInterval(n: number) {
  if (n <= 7) return 0;
  if (n <= 14) return 1;
  if (n <= 21) return 2;
  if (n <= 31) return 3;
  if (n <= 60) return 6;
  return Math.floor(n / 7);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
  currencyCode,
  locale,
  groupBy,
  t,
}: any) {
  if (!active || !payload?.length) return null;

  const p = payload[0]?.payload;
  if (!p) return null;

  const dateLabel = String(label || '');
  const head = shortLabel(dateLabel, groupBy);

  return (
    <div className="rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-lg px-3 py-2.5 min-w-[180px]">
      <div className="text-[11px] text-muted-foreground font-medium mb-2">
        {head || dateLabel}
      </div>

      <Row label={t('stats.balanceOpen') || 'Open'} value={formatCurrency(p.balance_open ?? 0, currencyCode, locale)} />
      <Row label={t('stats.balanceClose') || 'Close'} value={formatCurrency(p.balance_close ?? 0, currencyCode, locale)} />
      <Row label={t('stats.delta') || 'Δ'} value={formatCurrency(p.delta ?? 0, currencyCode, locale)} />
      <Row label={t('stats.min') || 'Min'} value={formatCurrency(p.min_balance ?? 0, currencyCode, locale)} />
      <Row label={t('stats.max') || 'Max'} value={formatCurrency(p.max_balance ?? 0, currencyCode, locale)} />
      <Row label={t('stats.txCount') || 'Tx'} value={String(p.tx_count ?? 0)} />
    </div>
  );
}

export function BalanceTimeseriesChart({
  title,
  loading,
  data,
  currencyCode,
  locale,
  groupBy,
}: {
  title: string;
  loading: boolean;
  data: BalanceTimeseriesView | null;
  currencyCode: string;
  locale?: string;
  groupBy: StatsGroupBy;
}) {
  const { t } = useTranslation();
  const points = data?.points ?? [];
  const tickInterval = useMemo(() => estimateTickInterval(points.length), [points.length]);

  const yDomain = useMemo(() => {
    if (!points.length) return undefined;

    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      const v = Number(p.balance_close ?? 0);
      min = Math.min(min, v, Number(p.min_balance ?? v));
      max = Math.max(max, v, Number(p.max_balance ?? v));
    }
    if (!isFinite(min) || !isFinite(max)) return undefined;
    if (min === max) {
      const pad = Math.max(1, Math.abs(min) * 0.1);
      return [min - pad, max + pad] as any;
    }
    const pad = (max - min) * 0.08;
    return [min - pad, max + pad] as any;
  }, [points]);

  return (
    <Card className="border border-border/40 bg-card/40 overflow-hidden shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {data ? `${data.from} → ${data.to}` : ''}
            </div>
          </div>

          {data?.totals ? (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">{t('stats.change') || 'Change'}</div>
              <div className="text-sm font-bold tabular-nums">
                {formatCurrency(data.totals.change ?? 0, currencyCode, locale)}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 h-52 relative">
          {loading && !data ? (
            <Skeleton className="h-full w-full rounded-2xl" />
          ) : !data || !points.length ? (
            <EmptyStateIllustration variant="no-data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />

                  <XAxis
                    dataKey="ts"
                    tickFormatter={(v) => shortLabel(String(v), groupBy)}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    interval={tickInterval}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    width={42}
                    axisLine={false}
                    tickLine={false}
                    domain={yDomain as any}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        currencyCode={currencyCode}
                        locale={locale}
                        groupBy={groupBy}
                        t={t}
                      />
                    }
                  />

                  <Area
                    type="monotone"
                    dataKey="balance_close"
                    stroke="hsl(142, 76%, 45%)"
                    strokeWidth={2.5}
                    fill="url(#balanceGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'hsl(142, 76%, 45%)', strokeWidth: 0 }}
                    isAnimationActive={!loading}
                    animationDuration={400}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {loading ? (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-background/10 rounded-2xl" />
                  <div className="absolute right-3 top-3 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm text-[11px] text-muted-foreground font-medium">
                    {t('stats.updating') || 'Updating'}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        {data?.totals ? (
          <div className="mt-3 space-y-1 pt-3 border-t border-border/30">
            <Row label={t('stats.start') || 'Start'} value={formatCurrency(data.totals.start_balance ?? 0, currencyCode, locale)} />
            <Row label={t('stats.end') || 'End'} value={formatCurrency(data.totals.end_balance ?? 0, currencyCode, locale)} />
            <Row label={t('stats.min') || 'Min'} value={formatCurrency(data.totals.min_balance ?? 0, currencyCode, locale)} />
            <Row label={t('stats.max') || 'Max'} value={formatCurrency(data.totals.max_balance ?? 0, currencyCode, locale)} />
            <Row label={t('stats.txCount') || 'Tx'} value={String(data.totals.tx_count ?? 0)} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
