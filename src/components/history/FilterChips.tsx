import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterType = 'all' | 'income' | 'expense';

interface FilterChipsProps {
    selectedFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}

export function FilterChips({ selectedFilter, onFilterChange }: FilterChipsProps) {
    const filters: { value: FilterType; label: string; color?: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'income', label: 'Income', color: 'text-green-500' },
        { value: 'expense', label: 'Expenses', color: 'text-red-500' },
    ];

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((filter) => {
                const isSelected = selectedFilter === filter.value;

                return (
                    <button
                        key={filter.value}
                        onClick={() => onFilterChange(filter.value)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium",
                            isSelected
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-card/50 text-foreground hover:bg-card/70 border border-border/50"
                        )}
                    >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span className={!isSelected && filter.color ? filter.color : ''}>
                            {filter.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
