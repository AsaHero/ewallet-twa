import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export type ExploreItem = {
  id: number;
  name: string;
  emoji?: string;
  total: number;
  count: number;
  share: number; // 0..1
};

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
        <div className="text-[12px] text-muted-foreground truncate max-w-[220px]">{title}</div>
        <div className="text-lg font-bold tabular-nums">{formatCurrency(amount, currencyCode, locale)}</div>
        <div className="text-[11px] text-muted-foreground">
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
    <Card className="border border-border/40 bg-card/40 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground">{items.length ? `${items.length} items` : ''}</div>
        </div>

        <div className="mt-3 h-56 relative">
          {loading && !items.length ? (
            <Skeleton className="h-full w-full rounded-2xl" />
          ) : !items.length ? (
            <div className="h-full rounded-2xl bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items}
                    dataKey="total"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={2}
                    onClick={(d: any) => onSelect?.(Number(d?.id))}
                    isAnimationActive={!loading}
                    animationDuration={260}
                  >
                    {items.map((it) => (
                      <Cell
                        key={it.id}
                        opacity={selectedId && it.id !== selectedId ? 0.35 : 1}
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
                  <div className="absolute inset-0 bg-background/10" />
                  <div className="absolute right-3 top-3 text-[11px] text-muted-foreground">
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

