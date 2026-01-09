import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, isSameMonth, isSameYear, endOfMonth } from 'date-fns';
import { ru, enUS, uz } from 'date-fns/locale';
import { Card, CardContent } from '../ui/card';
import { formatCurrency, softenWrapCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { DateRange } from './DateRangeSheet';
import { useMemo } from 'react';

interface SummaryCardProps {
  dateRange: DateRange;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  currencyCode: string;
  locale?: string;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onHeaderClick: () => void;
}

function getLocaleObject(locale?: string) {
  const l = (locale || 'en').toLowerCase();
  if (l.startsWith('ru')) return ru;
  if (l.startsWith('uz')) return uz;
  return enUS;
}

function formatDateRange(from: Date, to: Date, locale?: string) {
  const loc = getLocaleObject(locale);

  const fromDay = from.getDate();
  const toDay = to.getDate();

  if (isSameMonth(from, to) && fromDay === 1 && toDay === endOfMonth(from).getDate()) {
    return format(from, 'LLLL yyyy', { locale: loc });
  }

  if (isSameYear(from, to)) {
    if (isSameMonth(from, to)) {
      return `${format(from, 'd', { locale: loc })} – ${format(to, 'd MMMM yyyy', { locale: loc })}`;
    }
    return `${format(from, 'd MMM', { locale: loc })} – ${format(to, 'd MMM yyyy', { locale: loc })}`;
  }

  return `${format(from, 'd MMM yyyy', { locale: loc })} – ${format(to, 'd MMM yyyy', { locale: loc })}`;
}

export function SummaryCard({
  dateRange,
  totalIncome,
  totalExpense,
  netBalance,
  currencyCode,
  locale,
  onPrev,
  onNext,
  canGoPrev = true,
  canGoNext = true,
  onHeaderClick,
}: SummaryCardProps) {
  const { t } = useTranslation();

  const isPositive = netBalance >= 0;

  const headerText = useMemo(
    () => formatDateRange(dateRange.from, dateRange.to, locale),
    [dateRange.from, dateRange.to, locale]
  );

  const incomeText = useMemo(
    () => softenWrapCurrency(formatCurrency(totalIncome, currencyCode, locale)),
    [totalIncome, currencyCode, locale]
  );
  const expenseText = useMemo(
    () => softenWrapCurrency(formatCurrency(totalExpense, currencyCode, locale)),
    [totalExpense, currencyCode, locale]
  );
  const netText = useMemo(
    () => softenWrapCurrency(formatCurrency(netBalance, currencyCode, locale)),
    [netBalance, currencyCode, locale]
  );

  return (
    <Card className="rounded-3xl border border-border/40 bg-card/40 overflow-hidden">
      <CardContent className="p-5">
        {/* Header / Period selector */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              'transition-colors active:scale-[0.99]',
              canGoPrev
                ? 'hover:bg-muted/30 text-foreground'
                : 'opacity-30 cursor-not-allowed text-muted-foreground'
            )}
            aria-label={t('history.prevPeriod')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onHeaderClick}
            className={cn(
              'min-w-0 flex-1',
              'h-10 px-3 rounded-full',
              'flex items-center justify-center gap-2',
              'transition-colors active:scale-[0.99]',
              'hover:bg-muted/30'
            )}
            aria-label={t('history.selectDateRange')}
          >
            <h2 className="min-w-0 text-[15px] font-semibold text-foreground tracking-tight capitalize truncate">
              {headerText}
            </h2>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>

          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              'transition-colors active:scale-[0.99]',
              canGoNext
                ? 'hover:bg-muted/30 text-foreground'
                : 'opacity-30 cursor-not-allowed text-muted-foreground'
            )}
            aria-label={t('history.nextPeriod')}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Income */}
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="opacity-80">↗</span>
              <span>{t('common.income')}</span>
            </div>

            <p
              className={cn(
                'mt-1 font-extrabold tabular-nums tracking-tight leading-tight min-w-0',
                'text-[clamp(14px,4.8vw,22px)]',
                'break-words',
                'text-emerald-500'
              )}
            >
              +{incomeText}
            </p>
          </div>

          {/* Expenses */}
          <div className="min-w-0 text-right">
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <span className="opacity-80">↘</span>
              <span>{t('common.expense')}</span>
            </div>

            <p
              className={cn(
                'mt-1 font-extrabold tabular-nums tracking-tight leading-tight min-w-0',
                'text-[clamp(14px,4.8vw,22px)]',
                'break-words',
                'text-rose-500'
              )}
            >
              -{expenseText}
            </p>
          </div>
        </div>

        {/* Net */}
        <div className="mt-4 pt-4 border-t border-border/40 min-w-0">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <span className="text-sm text-muted-foreground pt-[2px]">
              {t('history.netBalance')}
            </span>

            <span
              className={cn(
                'min-w-0 text-right',
                'font-extrabold tabular-nums tracking-tight leading-tight',
                'text-[clamp(13px,4.3vw,18px)]',
                'break-words',
                isPositive ? 'text-emerald-500' : 'text-rose-500'
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
