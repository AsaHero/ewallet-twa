import { Check, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const filters: { value: FilterType; label: string; hint?: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expenses' },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
        {filters.map((f) => {
          const isSelected = selectedFilter === f.value;

          return (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                "relative flex items-center gap-1.5 px-4 h-10 rounded-full whitespace-nowrap transition-all text-sm font-semibold",
                "border border-border/50",
                isSelected ? "text-primary-foreground" : "bg-card/50 text-foreground hover:bg-card/70"
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId="chip-bg"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {isSelected && <Check className="w-3.5 h-3.5" />}
                <span>{f.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {onOpenFilters && (
        <button
          onClick={onOpenFilters}
          className={cn(
            "h-10 px-3 rounded-full border border-border/50 bg-card/50 hover:bg-card/70 transition-colors",
            "flex items-center gap-2 text-sm font-semibold"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {activeCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
