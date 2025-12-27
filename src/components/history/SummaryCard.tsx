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

    return (
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm">
            <CardContent className="p-6">
                {/* Month Selector */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => onMonthChange('prev')}
                        disabled={!canGoPrev}
                        className={cn(
                            "p-2 rounded-full transition-all",
                            canGoPrev
                                ? "hover:bg-primary/10 text-foreground"
                                : "opacity-30 cursor-not-allowed text-muted-foreground"
                        )}
                        aria-label="Previous month"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <h2 className="text-lg font-bold text-foreground">
                        {formatMonthYear(selectedMonth, locale)}
                    </h2>

                    <button
                        onClick={() => onMonthChange('next')}
                        disabled={!canGoNext}
                        className={cn(
                            "p-2 rounded-full transition-all",
                            canGoNext
                                ? "hover:bg-primary/10 text-foreground"
                                : "opacity-30 cursor-not-allowed text-muted-foreground"
                        )}
                        aria-label="Next month"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="text-green-500">↗</span>
                            <span>Income</span>
                        </div>
                        <p className="text-xl font-bold text-green-500 tabular-nums">
                            +{formatCurrency(totalIncome, currencyCode, locale)}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="text-red-500">↘</span>
                            <span>Expenses</span>
                        </div>
                        <p className="text-xl font-bold text-red-500 tabular-nums">
                            -{formatCurrency(totalExpense, currencyCode, locale)}
                        </p>
                    </div>
                </div>

                {/* Net Balance */}
                <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Net Balance</span>
                        <span className={cn(
                            "text-lg font-bold tabular-nums",
                            isPositive ? "text-green-500" : "text-red-500"
                        )}>
                            {isPositive ? '+' : ''}{formatCurrency(netBalance, currencyCode, locale)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
