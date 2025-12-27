import { X } from 'lucide-react';
import type { Transaction, Category, Subcategory, Account } from '@/core/types';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface TransactionDetailModalProps {
    transaction: Transaction | null;
    categories: Category[];
    subcategories: Subcategory[];
    accounts: Account[];
    locale?: string;
    timezone?: string;
    onClose: () => void;
}

export function TransactionDetailModal({
    transaction,
    categories,
    subcategories,
    accounts,
    locale,
    timezone,
    onClose,
}: TransactionDetailModalProps) {
    if (!transaction) return null;

    const category = categories.find((c) => c.id === transaction.category_id);
    const subcategory = subcategories.find((s) => s.id === transaction.subcategory_id);
    const account = accounts.find((a) => a.id === transaction.account_id);

    const displayEmoji = subcategory?.emoji || category?.emoji || '📌';
    const displayName = transaction.note || (transaction.type === 'deposit' ? 'Income' : 'Expense');
    const isIncome = transaction.type === 'deposit';

    const hasFx =
        transaction.original_amount !== undefined &&
        !!transaction.original_currency_code &&
        transaction.original_currency_code !== transaction.currency_code;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-background rounded-t-3xl shadow-xl animate-in slide-in-from-bottom-full duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="text-lg font-bold text-foreground">Transaction Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Icon and Title */}
                    <div className="text-center space-y-3">
                        <div className="text-5xl">{displayEmoji}</div>
                        <h3 className="text-xl font-semibold text-foreground">{displayName}</h3>
                        <p
                            className={cn(
                                'text-3xl font-bold tabular-nums',
                                isIncome ? 'text-green-500' : 'text-red-500'
                            )}
                        >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(transaction.amount, transaction.currency_code, locale)}
                        </p>
                    </div>

                    {/* Currency Conversion Section */}
                    {hasFx && (
                        <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">
                                Currency Conversion
                            </h4>
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Original Amount</span>
                                    <span className="font-medium">
                                        {formatCurrency(
                                            transaction.original_amount!,
                                            transaction.original_currency_code!,
                                            locale
                                        )}
                                    </span>
                                </div>
                                {transaction.fx_rate && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Exchange Rate</span>
                                        <span className="font-medium">
                                            {transaction.fx_rate.toFixed(4)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="space-y-3">
                        <DetailRow
                            label="Type"
                            value={isIncome ? 'Income' : 'Expense'}
                            icon={isIncome ? '💰' : '💸'}
                        />
                        {category && (
                            <DetailRow
                                label="Category"
                                value={category.name}
                                icon={category.emoji || '📁'}
                            />
                        )}
                        {subcategory && (
                            <DetailRow
                                label="Subcategory"
                                value={subcategory.name}
                                icon={subcategory.emoji || '📌'}
                            />
                        )}
                        {account && (
                            <DetailRow label="Account" value={account.name} icon="📊" />
                        )}
                        <DetailRow
                            label="Date & Time"
                            value={formatDateTime(
                                transaction.performed_at || transaction.created_at,
                                timezone,
                                locale
                            )}
                            icon="📅"
                        />
                    </div>

                    {/* Note Section */}
                    {transaction.note && (
                        <div className="bg-muted/50 rounded-2xl p-4">
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                Note
                            </h4>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                {transaction.note}
                            </p>
                        </div>
                    )}
                </div>

                {/* Safe area for bottom */}
                <div className="h-safe-bottom" />
            </div>
        </div>
    );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
                <span>{icon}</span>
                <span className="text-sm">{label}</span>
            </div>
            <span className="text-sm font-medium text-foreground">{value}</span>
        </div>
    );
}
