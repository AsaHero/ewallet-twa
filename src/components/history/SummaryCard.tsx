import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { formatCurrency, formatMonthYear } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  selectedMonth: Date;
  totalIncome: number;
  totalExpense: number;
  currencyCode: string;
  locale?: string;
  onMonthChange: (direction: 'prev' | 'next') => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
}

function softenWrapCurrency(input: string) {
  // Intl often uses NBSP (non-breaking space) which prevents wrapping and can cause horizontal scrolling.
  // We keep precision 100% but make wrapping possible.
  return input
    .replace(/\u00A0/g, ' ')
    // allow wrapping after common separators without breaking digits arbitrarily:
    .replace(/,/g, ',\u200B')
    .replace(/ /g, ' \u200B');
}

export function SummaryCard({
  selectedMonth,
  totalIncome,
  totalExpense,
  currencyCode,
  locale,
  onMonthChange,
  canGoPrev = true,
  canGoNext = true,
}: SummaryCardProps) {
  const netBalance = totalIncome - totalExpense;
  const isPositive = netBalance >= 0;

  const incomeText = softenWrapCurrency(formatCurrency(totalIncome, currencyCode, locale));
  const expenseText = softenWrapCurrency(formatCurrency(totalExpense, currencyCode, locale));
  const netText = softenWrapCurrency(formatCurrency(netBalance, currencyCode, locale));

  return (
    <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-5 overflow-hidden">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => onMonthChange('prev')}
            disabled={!canGoPrev}
            className={cn(
              'p-2 rounded-full transition-all',
              canGoPrev
                ? 'hover:bg-primary/10 text-foreground active:scale-[0.98]'
                : 'opacity-30 cursor-not-allowed text-muted-foreground'
            )}
            aria-label="Previous month"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h2 className="text-[15px] font-bold text-foreground tracking-tight">
            {formatMonthYear(selectedMonth, locale)}
          </h2>

          <button
            onClick={() => onMonthChange('next')}
            disabled={!canGoNext}
            className={cn(
              'p-2 rounded-full transition-all',
              canGoNext
                ? 'hover:bg-primary/10 text-foreground active:scale-[0.98]'
                : 'opacity-30 cursor-not-allowed text-muted-foreground'
            )}
            aria-label="Next month"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Income */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="text-green-500">↗</span>
              <span>Income</span>
            </div>

            <p
              className={cn(
                'text-green-500 font-extrabold tabular-nums tracking-tight leading-tight',
                // responsive size; smaller on tiny screens
                'text-[clamp(14px,4.8vw,22px)]',
                // allow wrapping INSIDE the card without causing horizontal scroll:
                'whitespace-normal break-words overflow-hidden'
              )}
            >
              +{incomeText}
            </p>
          </div>

          {/* Expenses */}
          <div className="space-y-1 min-w-0 text-right">
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <span className="text-red-500">↘</span>
              <span>Expenses</span>
            </div>

            <p
              className={cn(
                'text-red-500 font-extrabold tabular-nums tracking-tight leading-tight',
                'text-[clamp(14px,4.8vw,22px)]',
                'whitespace-normal break-words overflow-hidden'
              )}
            >
              -{expenseText}
            </p>
          </div>
        </div>

        {/* Net Balance */}
        <div className="pt-4 border-t border-border/50 min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <span className="text-sm text-muted-foreground pt-[2px]">Net Balance</span>

            <span
              className={cn(
                'font-extrabold tabular-nums tracking-tight leading-tight text-right min-w-0',
                'text-[clamp(13px,4.3vw,18px)]',
                'whitespace-normal break-words overflow-hidden',
                isPositive ? 'text-green-500' : 'text-red-500'
              )}
            >
              {isPositive ? '+' : ''}
              {netText}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
