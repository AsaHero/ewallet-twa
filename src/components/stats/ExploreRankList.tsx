import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { ExploreItem } from './ExploreDonut';
import { EmptyStateIllustration } from './EmptyStateIllustration';

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

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
  const hiddenCount = items.length - collapsedCount;

  return (
    <Card className="border border-border/40 bg-card/40 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(totals.total, currencyCode, locale)}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {!items.length ? (
            <EmptyStateIllustration variant="no-data" />
          ) : (
            <>
              {shown.map((it, index) => {
                const selected = selectedId === it.id;
                const rankMedal = index < 3 ? RANK_MEDALS[index] : null;

                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onSelect?.(it.id)}
                    className={cn(
                      'w-full text-left rounded-2xl border px-3 py-3 transition-all duration-200 active:scale-[0.98]',
                      selected
                        ? 'border-primary/50 bg-primary/10 shadow-md'
                        : 'border-border/40 bg-background/40 hover:bg-background/60 hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-muted/30 flex items-center justify-center text-xl flex-shrink-0 relative">
                          {it.emoji || '📌'}
                          {rankMedal && (
                            <span className="absolute -top-1 -right-1 text-xs">
                              {rankMedal}
                            </span>
                          )}
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
                        className={cn(
                          "h-full transition-all duration-500 ease-out",
                          selected ? "bg-primary" : "bg-primary/70"
                        )}
                        style={{
                          width: `${Math.max(0, Math.min(100, (it.share || 0) * 100))}%`,
                          background: selected
                            ? 'linear-gradient(90deg, hsl(142, 76%, 36%) 0%, hsl(142, 76%, 46%) 100%)'
                            : 'linear-gradient(90deg, hsl(142, 76%, 36% / 0.7) 0%, hsl(142, 76%, 46% / 0.7) 100%)'
                        }}
                      />
                    </div>
                  </button>
                );
              })}

              {canExpand ? (
                <button
                  type="button"
                  onClick={onToggleExpanded}
                  className="w-full rounded-2xl border border-border/40 bg-background/40 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all active:scale-[0.99]"
                >
                  {expanded
                    ? `Show less ↑`
                    : `Show ${hiddenCount} more ↓`
                  }
                </button>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
