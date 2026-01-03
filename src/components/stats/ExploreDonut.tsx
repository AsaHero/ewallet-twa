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

  // If tail totals are basically zero, skip "Others"
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
  // Heuristic based on formatted length (locale/currency dependent)
  const n = amountStr.length;
  if (n >= 18) return 'text-[clamp(14px,3.4vw,18px)] font-semibold tracking-tight';
  if (n >= 14) return 'text-[clamp(15px,3.8vw,20px)] font-semibold tracking-tight';
  return 'text-[clamp(16px,4.2vw,22px)] font-bold';
}

function CenterLabel({
  selected,
  total,
  count,
  currencyCode,
  locale,
  onDrillDown,
}: {
  selected?: ExploreItem | null;
  total: number;
  count: number;
  currencyCode: string;
  locale?: string;
  onDrillDown?: (id: number) => void;
}) {
  const isOther = selected?.id === OTHER_ID || selected?.kind === 'other';

  const title = selected ? `${selected.emoji || '📌'} ${selected.name}` : 'Total';
  const amount = selected ? selected.total : total;
  const tx = selected ? selected.count : count;
  const pct = selected ? Math.round((selected.share || 0) * 100) : null;

  const amountStr = formatCurrency(amount, currencyCode, locale);
  const amountCls = amountTypographyClass(amountStr);

  const canDrill = !!selected && !isOther && typeof onDrillDown === 'function';

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Click layer (only when drill is available) */}
      {canDrill ? (
        <button
          type="button"
          onClick={() => onDrillDown?.(selected!.id)}
          className="absolute inset-0 rounded-2xl"
          aria-label="Open details"
        />
      ) : null}

      <div className="pointer-events-none text-center px-3 max-w-[260px]">
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
            className="text-[11px] text-muted-foreground mt-0.5"
          >
            {tx} tx{pct !== null ? ` • ${pct}%` : ''}
            {canDrill ? ' • Tap to open' : ''}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Custom render function for active (selected) pie slice
// This creates the "bump out" effect by increasing the outer radius
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

  const bump = 6; // pixels to expand

  return (
    <g>
      {/* Main expanded sector */}
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
      {/* Halo ring for extra visual emphasis */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + bump + 2}
        outerRadius={outerRadius + bump + 4}
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
    // Mobile-ish heuristic: pointer coarse
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
    const otherLabel =
      (t('stats.other') as string) ||
      (t('common.other') as string) ||
      'Others';

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



  const handleSelect = (id: number) => {
    if (loading) return;

    // Tap again behavior
    if (selectedId === id) {
      // Drill-down only if not Others
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
    <Card className="border border-border/40 bg-card/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground">
            {chartItems.length ? `${chartItems.length} items` : ''}
          </div>
        </div>

        <div className="mt-3 h-56 relative">
          {loading && !chartItems.length ? (
            <Skeleton className="h-full w-full rounded-2xl" />
          ) : !chartItems.length ? (
            <EmptyStateIllustration variant="no-data" />
          ) : (
            <>

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>
                  <Pie
                    data={chartItems}
                    dataKey="total"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="90%"
                    paddingAngle={isCoarsePointer ? 3 : 2}
                    isAnimationActive={!loading}
                    animationDuration={420}
                    animationBegin={0}
                    {...({ activeIndex, activeShape: renderActiveShape } as any)}
                    // Recharts gives payload for click; we also stop background reset.
                    onClick={(data: any, _: number, e: any) => {
                      e?.stopPropagation?.();
                      handleSelect(Number(data?.id));
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
                        />
                      );
                    })}
                  </Pie>

                  {/* Tooltip: desktop only (mobile uses center label) */}
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
                onDrillDown={(id) => {
                  // center tap drill-down (disabled for Others inside CenterLabel)
                  if (loading) return;
                  hapticImpactLight();
                  onDrillDown?.(id);
                }}
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
