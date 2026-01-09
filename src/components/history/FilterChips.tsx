import { Check, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type FilterType = 'all' | 'income' | 'expense';

interface FilterChipsProps {
  selectedFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onOpenFilters?: () => void;
  activeCount?: number;
}

export function FilterChips({
  selectedFilter,
  onFilterChange,
  onOpenFilters,
  activeCount = 0,
}: FilterChipsProps) {
  const { t } = useTranslation();

  const filters = useMemo(
    () =>
      [
        { value: 'all' as const, label: t('history.filters.chips.all') },
        { value: 'income' as const, label: t('history.filters.chips.income') },
        { value: 'expense' as const, label: t('history.filters.chips.expense') },
      ] as const,
    [t]
  );

  return (
    <div className="flex items-center gap-2">
      {/* Chips */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map((f) => {
            const isSelected = selectedFilter === f.value;

            return (
              <button
                key={f.value}
                onClick={() => onFilterChange(f.value)}
                className={cn(
                  'relative shrink-0 h-10 px-4 rounded-full',
                  'text-sm font-semibold',
                  'transition-colors active:scale-[0.99]',
                  'focus:outline-none focus:ring-2 focus:ring-primary/25',
                  isSelected
                    ? 'text-primary-foreground'
                    : 'text-foreground bg-card/40 hover:bg-card/60 border border-border/40'
                )}
              >
                {/* Animated selected background */}
                {isSelected && (
                  <motion.span
                    layoutId="filter-chip-bg"
                    className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/15"
                    transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                  />
                )}

                <span className="relative z-10 flex items-center gap-1.5">
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  <span className="whitespace-nowrap">{f.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters button (secondary) */}
      {onOpenFilters && (
        <button
          onClick={onOpenFilters}
          className={cn(
            'relative h-10 w-10 rounded-full',
            'border border-border/40 bg-card/40 hover:bg-card/60 transition-colors',
            'flex items-center justify-center',
            'focus:outline-none focus:ring-2 focus:ring-primary/25'
          )}
          aria-label={t('history.filters.open')}
        >
          <SlidersHorizontal className="w-4 h-4 text-foreground" />

          {activeCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1',
                'min-w-[18px] h-[18px] px-1',
                'rounded-full bg-primary text-primary-foreground',
                'text-[11px] font-bold leading-[18px] text-center',
                'shadow-sm shadow-primary/20'
              )}
            >
              {activeCount > 99 ? '99+' : activeCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
