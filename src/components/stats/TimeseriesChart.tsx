import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeseriesStatsView } from '@/core/types';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

function shortLabel(ts: string, groupBy: 'day' | 'week' | 'month') {
  // Expect formats like YYYY-MM-DD (day/week) or YYYY-MM (month) depending on backend.
  if (!ts) return '';
  if (groupBy === 'month') return ts.slice(0, 7); // YYYY-MM
  if (groupBy === 'week') return ts.slice(5, 10); // MM-DD (week start)
  return ts.slice(5, 10); // MM-DD
}

function estimateTickInterval(n: number) {
  // Aim ~5-7 ticks max on mobile
  if (n <= 7) return 0;
  if (n <= 14) return 1;
  if (n <= 21) return 2;
  if (n <= 31) return 3;
  if (n <= 60) return 6;
  return Math.floor(n / 7);
}

function humanKey(name: string) {
  if (name === 'income') return 'Income';
  if (name === 'expense') return 'Expense';
  if (name === 'net') return 'Net';
  return name;
}

function ValueRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
}: any) {
  if (!active || !payload?.length) return null;

  // payload contains rows for each Line that exists
  const map: Record<string, number> = {};
  for (const p of payload) {
    if (!p?.dataKey) continue;
    map[p.dataKey] = Number(p.value ?? 0);
  }

  const dateLabel = String(label || '');
  const short = shortLabel(dateLabel, groupBy);

  return (
    <div className="rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-lg px-3 py-2 min-w-[160px]">
      <div className="text-[11px] text-muted-foreground mb-2">
        {short || dateLabel}
      </div>

      {'net' in map && (
        <ValueRow
          label={humanKey('net')}
          value={formatCurrency(map.net, currencyCode, locale)}
        />
      )}
      {'income' in map && (
        <ValueRow
          label={humanKey('income')}
          value={formatCurrency(map.income, currencyCode, locale)}
        />
      )}
      {'expense' in map && (
        <ValueRow
          label={humanKey('expense')}
          value={formatCurrency(map.expense, currencyCode, locale)}
        />
      )}
    </div>
  );
}

export function TimeseriesChart({
  title,
  loading,
  data,
  currencyCode,
  locale,
  groupBy,
}: {
  title: string;
  loading: boolean;
  data: TimeseriesStatsView | null;
  currencyCode: string;
  locale?: string;
  groupBy: 'day' | 'week' | 'month';
}) {
  // Mobile readability: show Net by default; let user toggle income/expense.
  // (Still optional—keeps chart clean.)
  const [showBreakdown, setShowBreakdown] = useState(false);

  const points = data?.points ?? [];

  const tickInterval = useMemo(() => estimateTickInterval(points.length), [points.length]);

  const yDomain = useMemo(() => {
    if (!points.length) return undefined;

    // Domain based on visible series
    let min = Infinity;
    let max = -Infinity;

    for (const p of points) {
      const net = Number(p.net ?? 0);
      min = Math.min(min, net);
      max = Math.max(max, net);

      if (showBreakdown) {
        const income = Number(p.income ?? 0);
        const expense = Number(p.expense ?? 0);
        min = Math.min(min, income, expense);
        max = Math.max(max, income, expense);
      }
    }

    if (!isFinite(min) || !isFinite(max)) return undefined;
    if (min === max) {
      // add some breathing room
      const pad = Math.max(1, Math.abs(min) * 0.1);
      return [min - pad, max + pad] as any;
    }

    const pad = (max - min) * 0.08;
    return [min - pad, max + pad] as any;
  }, [points, showBreakdown]);

  return (
    <Card className="border border-border/40 bg-card/40 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {data ? `${data.from} → ${data.to}` : ''}
            </div>
          </div>

          {/* Toggle to keep chart clean by default */}
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className={cn(
              'h-9 px-3 rounded-xl text-xs font-semibold transition-colors border',
              showBreakdown
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'bg-background/40 border-border/50 text-muted-foreground hover:text-foreground'
            )}
          >
            {showBreakdown ? 'Net + Breakdown' : 'Net only'}
          </button>
        </div>

        <div className="mt-3 h-52 relative">
          {loading && !data ? (
            <Skeleton className="h-full w-full rounded-2xl" />
          ) : !data || !points.length ? (
            <div className="h-full rounded-2xl bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="ts"
                    tickFormatter={(v) => shortLabel(String(v), groupBy)}
                    tick={{ fontSize: 11 }}
                    interval={tickInterval}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={38}
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
                      />
                    }
                  />

                  {/* Net always */}
                  <Line
                    type="monotone"
                    dataKey="net"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={!loading}
                    animationDuration={260}
                  />

                  {/* Optional breakdown */}
                  {showBreakdown && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="income"
                        strokeWidth={1.8}
                        dot={false}
                        isAnimationActive={!loading}
                        animationDuration={260}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        strokeWidth={1.8}
                        dot={false}
                        isAnimationActive={!loading}
                        animationDuration={260}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>

              {/* refresh overlay without layout jump */}
              {loading ? (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-background/10" />
                  <div className="absolute right-3 top-3 text-[11px] text-muted-foreground">
                    Updating…
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* tiny helper text */}
        {data && points.length ? (
          <div className="mt-2 text-[11px] text-muted-foreground">
            Tap points to see exact values.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
