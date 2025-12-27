import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const isOpen = !!transaction;

  const category = transaction ? categories.find((c) => c.id === transaction.category_id) : undefined;
  const subcategory = transaction ? subcategories.find((s) => s.id === transaction.subcategory_id) : undefined;
  const account = transaction ? accounts.find((a) => a.id === transaction.account_id) : undefined;

  const displayEmoji = subcategory?.emoji || category?.emoji || '📌';
  const displayName =
    transaction?.note || (transaction?.type === 'deposit' ? t('transaction.income') : t('transaction.expense'));

  const isIncome = transaction?.type === 'deposit';

  const hasFx =
    transaction?.original_amount !== undefined &&
    !!transaction?.original_currency_code &&
    transaction?.original_currency_code !== transaction?.currency_code;

  return (
    <AnimatePresence>
      {isOpen && transaction && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-t-3xl bg-background shadow-2xl border border-border/50">
              {/* Header */}
              <div className="px-4 pt-3 pb-2 border-b border-border/50">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
                <div className="mt-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">{t('transaction.detail')}</h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4 space-y-5 max-h-[72vh] overflow-y-auto overscroll-contain">
                <div className="text-center space-y-2">
                  <div className="text-5xl">{displayEmoji}</div>
                  <h3 className="text-lg font-semibold text-foreground">{displayName}</h3>
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

                {hasFx && (
                  <div className="bg-muted/40 rounded-2xl p-4 space-y-2 border border-border/50">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      {t('transaction.currencyConversion')}
                    </h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('transaction.original')}</span>
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
                          <span className="text-muted-foreground">{t('transaction.fxRate')}</span>
                          <span className="font-medium">{transaction.fx_rate.toFixed(4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-card/40 border border-border/50 rounded-2xl p-4 space-y-3">
                  <DetailRow label={t('transaction.type')} value={isIncome ? t('transaction.income') : t('transaction.expense')} icon={isIncome ? '💰' : '💸'} />
                  {category && <DetailRow label={t('transaction.category')} value={category.name} icon={category.emoji || '📁'} />}
                  {subcategory && <DetailRow label={t('transaction.subcategory')} value={subcategory.name} icon={subcategory.emoji || '📌'} />}
                  {account && <DetailRow label={t('transaction.account')} value={account.name} icon="📊" />}
                  <DetailRow
                    label={t('transaction.dateTime')}
                    value={formatDateTime(transaction.performed_at || transaction.created_at, timezone, locale)}
                    icon="📅"
                  />
                </div>

                {transaction.note && (
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border/50">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('transaction.note')}</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{transaction.note}</p>
                  </div>
                )}
              </div>

              <div className="h-safe-bottom" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
