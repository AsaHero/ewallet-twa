import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
} from 'recharts';
import { EmptyStateIllustration } from './EmptyStateIllustration';

export type ExploreItem = {
  id: number;
  name: string;
  emoji?: string;
  total: number;
  count: number;
  share: number; // 0..1
  kind?: 'item' | 'other';
};

const TOP_N = 7;
const OTHER_ID = -1;

// Gradient color palette that works in both light and dark mode
const CHART_COLORS = [
  'hsl(142, 76%, 45%)', // Primary green
  'hsl(200, 76%, 50%)', // Blue
  'hsl(280, 65%, 55%)', // Purple
  'hsl(30, 85%, 55%)',  // Orange
  'hsl(340, 75%, 55%)', // Pink
  'hsl(180, 65%, 50%)', // Cyan
  'hsl(50, 85%, 55%)',  // Yellow
  'hsl(260, 70%, 55%)', // Indigo
  'hsl(15, 80%, 55%)',  // Red-Orange
  'hsl(160, 70%, 50%)', // Teal
];

function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// Telegram haptics (safe in web too)
function hapticSelectionChanged() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any)?.Telegram?.WebApp;
  try {
    tg?.HapticFeedback?.selectionChanged?.();
  } catch {
    // ignore
  }
}
function hapticImpactLight() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any)?.Telegram?.WebApp;
  try {
    tg?.HapticFeedback?.impactOccurred?.('light');
  } catch {
    // ignore
  }
}

function buildTopNWithOther(raw: ExploreItem[], topN: number, otherLabel: string): ExploreItem[] {
  const items = [...raw].filter((x) => Number.isFinite(x.total) && x.total !== 0);
  if (items.length <= topN) return items.map((x) => ({ ...x, kind: 'item' }));

  const sorted = items.sort((a, b) => (b.total || 0) - (a.total || 0));
  const head = sorted.slice(0, topN).map((x) => ({ ...x, kind: 'item' as const }));
  const tail = sorted.slice(topN);

  const otherTotal = tail.reduce((s, x) => s + (x.total || 0), 0);
  const otherCount = tail.reduce((s, x) => s + (x.count || 0), 0);
  const grand = sorted.reduce((s, x) => s + (x.total || 0), 0);

  if (!grand || otherTotal <= 0) return head;

  const other: ExploreItem = {
    id: OTHER_ID,
    name: otherLabel,
    emoji: '⋯',
    total: otherTotal,
    count: otherCount,
    share: otherTotal / grand,
    kind: 'other',
  };

  return [...head, other];
}

function amountTypographyClass(amountStr: string) {
  const n = amountStr.length;
  if (n >= 18) return 'text-[clamp(16px,3.8vw,22px)] font-semibold tracking-tight';
  if (n >= 14) return 'text-[clamp(17px,4.2vw,24px)] font-semibold tracking-tight';
  return 'text-[clamp(18px,4.6vw,26px)] font-bold';
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
  const { t } = useTranslation();
  const isOther = selected?.id === OTHER_ID || selected?.kind === 'other';

  const title = selected ? `${selected.emoji || '📌'} ${selected.name}` : t('stats.total');
  const amount = selected ? selected.total : total;
  const tx = selected ? selected.count : count;
  const pct = selected ? Math.round((selected.share || 0) * 100) : null;

  const amountStr = formatCurrency(amount, currencyCode, locale);
  const amountCls = amountTypographyClass(amountStr);

  return (
    // ✅ never block pie taps
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center px-3 max-w-[300px]">
        <div className="text-xs text-muted-foreground truncate font-medium">{title}</div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected ? `amt-${selected.id}` : 'amt-total'}
            initial={{ opacity: 0, y: 4, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.995 }}
            transition={{ duration: 0.14 }}
            className={`tabular-nums mt-1 leading-tight ${amountCls}`}
          >
            {amountStr}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected ? `meta-${selected.id}` : 'meta-total'}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.12 }}
            className="text-[11px] text-muted-foreground mt-1"
          >
            <div>
              {tx} tx{pct !== null ? ` • ${pct}%` : ''}
            </div>
            {selected && !isOther && (
              <div className="mt-0.5">
                • {t('stats.tapAgainToOpen')}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Active slice render (bump out + halo)
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    cornerRadius,
  } = props;

  const bump = 8;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + bump}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={cornerRadius}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + bump + 2}
        outerRadius={outerRadius + bump + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.22}
      />
    </g>
  );
};

export function ExploreDonut({
  title,
  loading,
  items,
  totals,
  selectedId,
  onSelect,
  onDrillDown,
  currencyCode,
  locale,
}: {
  title: string;
  loading: boolean;
  items: ExploreItem[];
  totals: { total: number; count: number };
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
  onDrillDown?: (id: number) => void;
  currencyCode: string;
  locale?: string;
}) {
  const { t } = useTranslation();
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    try {
      const mq = window.matchMedia?.('(pointer: coarse)');
      const update = () => setIsCoarsePointer(!!mq?.matches);
      update();
      mq?.addEventListener?.('change', update);
      return () => mq?.removeEventListener?.('change', update);
    } catch {
      // ignore
    }
  }, []);

  const chartItems = useMemo(() => {
    const otherLabel = t('stats.other', 'Others');

    return buildTopNWithOther(items, TOP_N, otherLabel);
  }, [items, t]);


  const selected = useMemo(() => {
    if (!selectedId) return null;
    return chartItems.find((x) => x.id === selectedId) || null;
  }, [chartItems, selectedId]);

  const activeIndex = useMemo(() => {
    if (!selectedId) return undefined;
    const idx = chartItems.findIndex((x) => x.id === selectedId);
    return idx >= 0 ? idx : undefined;
  }, [chartItems, selectedId]);

  // ✅ “second tap drills”
  const handleSelect = (id: number) => {
    if (loading) return;

    if (selectedId === id) {
      if (id !== OTHER_ID) {
        hapticImpactLight();
        onDrillDown?.(id);
      }
      return;
    }

    hapticSelectionChanged();
    onSelect?.(id);
  };

  return (
    // ✅ bigger overall container/card
    <Card className="border border-border/40 bg-card/40 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground">
            {chartItems.length ? `${chartItems.length} items` : ''}
          </div>
        </div>

        {/* ✅ bigger chart area */}
        <div className="mt-4 h-72 relative">
          {loading && !chartItems.length ? (
            <Skeleton className="h-full w-full rounded-2xl" />
          ) : !chartItems.length ? (
            <EmptyStateIllustration variant="no-data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartItems}
                    dataKey="total"
                    nameKey="name"
                    innerRadius="75%"
                    outerRadius="98%"
                    paddingAngle={isCoarsePointer ? 3 : 2}
                    isAnimationActive={!loading}
                    animationDuration={420}
                    animationBegin={0}
                    {...({ activeIndex, activeShape: renderActiveShape } as any)}
                    onClick={(data: any, _idx: number, e: any) => {
                      e?.stopPropagation?.();
                      const id = Number(data?.id ?? data?.payload?.id);
                      if (Number.isFinite(id)) handleSelect(id);
                    }}
                  >
                    {chartItems.map((it, index) => {
                      const isSelected = selectedId === it.id;
                      const dim = selectedId != null && !isSelected;

                      return (
                        <Cell
                          key={it.id}
                          fill={getChartColor(index)}
                          opacity={dim ? 0.35 : 1}
                          className="transition-opacity duration-200 cursor-pointer hover:opacity-100"
                          strokeWidth={isSelected ? 2 : 0}
                          stroke={isSelected ? getChartColor(index) : 'none'}
                          onMouseDown={(e: any) => {
                            e?.stopPropagation?.();
                            handleSelect(it.id);
                          }}
                          onTouchStart={(e: any) => {
                            e?.stopPropagation?.();
                            handleSelect(it.id);
                          }}
                        />
                      );
                    })}
                  </Pie>

                  {!isCoarsePointer ? (
                    <Tooltip
                      formatter={(value: any, _name: any, props: any) => {
                        const p = props?.payload as ExploreItem | undefined;
                        const v = Number(value ?? 0);
                        const pct = Math.round((p?.share || 0) * 100);
                        return [
                          `${formatCurrency(v, currencyCode, locale)} • ${pct}% • ${p?.count ?? 0} tx`,
                          p?.name || '',
                        ];
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
                  ) : null}
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
