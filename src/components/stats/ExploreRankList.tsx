import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { ExploreItem } from './ExploreDonut';

export function ExploreRankList({
  title,
  items,
  totals,
  expanded,
  onToggleExpanded,
  selectedId,
  onSelect,
  currencyCode,
  locale,
  collapsedCount = 5,
}: {
  title: string;
  items: ExploreItem[];
  totals: { total: number; count: number };
  expanded: boolean;
  onToggleExpanded: () => void;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  currencyCode: string;
  locale?: string;
  collapsedCount?: number;
}) {
  const shown = expanded ? items : items.slice(0, collapsedCount);
  const canExpand = items.length > collapsedCount;

  return (
    <Card className="border border-border/40 bg-card/40">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(totals.total, currencyCode, locale)}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {!items.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No data</div>
          ) : (
            <>
              {shown.map((it) => {
                const selected = selectedId === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onSelect?.(it.id)}
                    className={cn(
                      'w-full text-left rounded-2xl border px-3 py-3 transition-colors',
                      selected
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border/40 bg-background/40 hover:bg-background/60'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-muted/30 flex items-center justify-center text-xl">
                          {it.emoji || '📌'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{it.name}</div>
                          <div className="text-xs text-muted-foreground">{it.count} tx</div>
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
                        className="h-full bg-primary/70"
                        style={{ width: `${Math.max(0, Math.min(100, (it.share || 0) * 100))}%` }}
                      />
                    </div>
                  </button>
                );
              })}

              {canExpand ? (
                <button
                  type="button"
                  onClick={onToggleExpanded}
                  className="w-full rounded-2xl border border-border/40 bg-background/40 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-background/60"
                >
                  {expanded ? 'Show less' : 'Tap to show more'} {expanded ? '↑' : '↓'}
                </button>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
