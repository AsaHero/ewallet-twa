import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { EmptyStateIllustration } from './EmptyStateIllustration';

export type ExploreItem = {
  id: number;
  name: string;
  emoji?: string;
  total: number;
  count: number;
  share: number; // 0..1
};

// Gradient color palette that works in both light and dark mode
const CHART_COLORS = [
  'hsl(142, 76%, 45%)',   // Primary green
  'hsl(200, 76%, 50%)',   // Blue
  'hsl(280, 65%, 55%)',   // Purple
  'hsl(30, 85%, 55%)',    // Orange
  'hsl(340, 75%, 55%)',   // Pink
  'hsl(180, 65%, 50%)',   // Cyan
  'hsl(50, 85%, 55%)',    // Yellow
  'hsl(260, 70%, 55%)',   // Indigo
  'hsl(15, 80%, 55%)',    // Red-Orange
  'hsl(160, 70%, 50%)',   // Teal
];

function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function CenterLabel({
  selected,
  total,
  count,
  currencyCode,
  locale,
}: {
  selected?: ExploreItem | null;
  total: number;
  count: number;
  currencyCode: string;
  locale?: string;
}) {
  const title = selected ? `${selected.emoji || '📌'} ${selected.name}` : 'Total';
  const amount = selected ? selected.total : total;
  const tx = selected ? selected.count : count;
  const pct = selected ? Math.round((selected.share || 0) * 100) : null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="text-center px-3">
        <div className="text-xs text-muted-foreground truncate max-w-[220px] font-medium">{title}</div>
        <div className="text-xl font-bold tabular-nums mt-1">{formatCurrency(amount, currencyCode, locale)}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {tx} tx{pct !== null ? ` • ${pct}%` : ''}
        </div>
      </div>
    </div>
  );
}

export function ExploreDonut({
  title,
  loading,
  items,
  totals,
  selectedId,
  onSelect,
  currencyCode,
  locale,
}: {
  title: string;
  loading: boolean;
  items: ExploreItem[];
  totals: { total: number; count: number };
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  currencyCode: string;
  locale?: string;
}) {
  const { t } = useTranslation();
  const selected = useMemo(
    () => (selectedId ? items.find((x) => x.id === selectedId) : null) || null,
    [items, selectedId]
  );

  return (
    <Card className="border border-border/40 bg-card/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground">{items.length ? `${items.length} items` : ''}</div>
        </div>

        <div className="mt-3 h-56 relative">
          {loading && !items.length ? (
            <Skeleton className="h-full w-full rounded-2xl" />
          ) : !items.length ? (
            <EmptyStateIllustration variant="no-data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items}
                    dataKey="total"
                    nameKey="name"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={2}
                    onClick={(d: any) => onSelect?.(Number(d?.id))}
                    isAnimationActive={!loading}
                    animationDuration={400}
                    animationBegin={0}
                  >
                    {items.map((it, index) => (
                      <Cell
                        key={it.id}
                        fill={getChartColor(index)}
                        opacity={selectedId && it.id !== selectedId ? 0.35 : 1}
                        className="transition-opacity duration-200 cursor-pointer hover:opacity-100"
                        strokeWidth={selectedId === it.id ? 2 : 0}
                        stroke={selectedId === it.id ? getChartColor(index) : 'none'}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: any, _name: any, props: any) => {
                      const p = props?.payload as ExploreItem | undefined;
                      const v = Number(value ?? 0);
                      const pct = Math.round((p?.share || 0) * 100);
                      return [`${formatCurrency(v, currencyCode, locale)} • ${pct}% • ${p?.count ?? 0} tx`, p?.name || ''];
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background) / 0.95)',
                      border: '1px solid hsl(var(--border) / 0.5)',
                      borderRadius: '1rem',
                      backdropFilter: 'blur(12px)',
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <CenterLabel
                selected={selected}
                total={totals.total}
                count={totals.count}
                currencyCode={currencyCode}
                locale={locale}
              />

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
      </CardContent>
    </Card>
  );
}
