import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export type StatsType = 'all' | 'income' | 'expense';

export function StatsTypeChips({
  value,
  onChange,
}: {
  value: StatsType;
  onChange: (v: StatsType) => void;
}) {
  const { t } = useTranslation();

  const items: { value: StatsType; label: string }[] = [
    { value: 'all', label: t('common.all') || 'All' },
    { value: 'income', label: t('common.income') || 'Income' },
    { value: 'expense', label: t('common.expense') || 'Expenses' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {items.map((it) => {
        const selected = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-semibold',
              selected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card/50 text-foreground hover:bg-card/70 border border-border/50'
            )}
          >
            {selected && <Check className="w-3.5 h-3.5" />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
