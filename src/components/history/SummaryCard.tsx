
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, isSameMonth, isSameYear, endOfMonth } from 'date-fns';
import { ru, enUS, uz } from 'date-fns/locale';
import { Card, CardContent } from '../ui/card';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { DateRange } from './DateRangeSheet';

interface SummaryCardProps {
  dateRange: DateRange;
  totalIncome: number;
  totalExpense: number;
  currencyCode: string;
  locale?: string;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onHeaderClick: () => void;
}

function getLocaleObject(locale?: string) {
    if (locale === 'ru') return ru;
    if (locale === 'uz') return uz;
    return enUS;
}

function formatDateRange(from: Date, to: Date, locale?: string) {
    const loc = getLocaleObject(locale);

    // Check if it's a full month
    if (
        isSameMonth(from, to) &&
        from.getDate() === 1 &&
        to.getDate() === endOfMonth(from).getDate()
    ) {
        return format(from, 'LLLL yyyy', { locale: loc });
    }

    // Same year
    if (isSameYear(from, to)) {
        // Same month but partial
        if (isSameMonth(from, to)) {
            return `${format(from, 'd', { locale: loc })} - ${format(to, 'd MMMM yyyy', { locale: loc })}`;
        }
        // Different months
        return `${format(from, 'd MMM', { locale: loc })} - ${format(to, 'd MMM yyyy', { locale: loc })}`;
    }

    // Different years
    return `${format(from, 'd MMM yyyy', { locale: loc })} - ${format(to, 'd MMM yyyy', { locale: loc })}`;
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
  dateRange,
  totalIncome,
  totalExpense,
  currencyCode,
  locale,
  onPrev,
  onNext,
  canGoPrev = true,
  canGoNext = true,
  onHeaderClick,
}: SummaryCardProps) {
  const { t } = useTranslation();
  const netBalance = totalIncome - totalExpense;
  const isPositive = netBalance >= 0;

  const incomeText = softenWrapCurrency(formatCurrency(totalIncome, currencyCode, locale));
  const expenseText = softenWrapCurrency(formatCurrency(totalExpense, currencyCode, locale));
  const netText = softenWrapCurrency(formatCurrency(netBalance, currencyCode, locale));

  return (
    <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-5 overflow-hidden">
        {/* Date Selector Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className={cn(
              'p-2 rounded-full transition-all',
              canGoPrev
                ? 'hover:bg-primary/10 text-foreground active:scale-[0.98]'
                : 'opacity-30 cursor-not-allowed text-muted-foreground'
            )}
            aria-label="Previous period"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onHeaderClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-primary/10 active:scale-95 transition-all group"
          >
            <h2 className="text-[15px] font-bold text-foreground tracking-tight capitalize">
                {formatDateRange(dateRange.from, dateRange.to, locale)}
            </h2>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              'p-2 rounded-full transition-all',
              canGoNext
                ? 'hover:bg-primary/10 text-foreground active:scale-[0.98]'
                : 'opacity-30 cursor-not-allowed text-muted-foreground'
            )}
            aria-label="Next period"
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
              <span>{t('common.income')}</span>
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
              <span>{t('common.expense')}</span>
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
            <span className="text-sm text-muted-foreground pt-[2px]">{t('history.netBalance')}</span>

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
