import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Edit2, Trash2, Save } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import type { Transaction, Category, Subcategory, Account } from '@/core/types';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiClient } from '@/api/client';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  categories: Category[];
  subcategories: Subcategory[];
  accounts: Account[];
  locale?: string;
  timezone?: string;
  onClose: () => void;
  onTransactionUpdated?: () => void;
  onTransactionDeleted?: () => void;
}

interface EditableFields {
  category_id?: number;
  subcategory_id?: number;
  note?: string;
  performed_at?: string;
}

export function TransactionDetailModal({
  transaction,
  categories,
  subcategories,
  accounts,
  locale,
  timezone,
  onClose,
  onTransactionUpdated,
  onTransactionDeleted,
}: TransactionDetailModalProps) {
  const { t } = useTranslation();
  const { WebApp } = useTelegramWebApp();
  const isOpen = !!transaction;

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EditableFields>({});

  const category = transaction ? categories.find((c) => c.id === transaction.category_id) : undefined;
  const subcategory = transaction ? subcategories.find((s) => s.id === transaction.subcategory_id) : undefined;
  const account = transaction ? accounts.find((a) => a.id === transaction.account_id) : undefined;

  const displayEmoji = subcategory?.emoji || category?.emoji || '📌';
  const displayName =
    transaction?.note || (transaction?.type === 'deposit' ? t('transaction.income') : t('transaction.expense'));

  const isIncome = transaction?.type === 'deposit';
  const isPositive = (transaction?.amount ?? 0) >= 0;

  const hasFx =
    transaction?.original_amount !== undefined &&
    !!transaction?.original_currency_code &&
    transaction?.original_currency_code !== transaction?.currency_code;

  // Reset mode when transaction changes
  useEffect(() => {
    setMode('view');
    if (transaction) {
      setFormData({
        category_id: transaction.category_id,
        subcategory_id: transaction.subcategory_id,
        note: transaction.note,
        performed_at: transaction.performed_at || transaction.created_at,
      });
    }
  }, [transaction]);

  // Filter subcategories by selected category in edit mode
  const filteredSubcategories = useMemo(() => {
    if (!formData.category_id) return subcategories;
    return subcategories.filter((s) => s.category_id === formData.category_id);
  }, [formData.category_id, subcategories]);

  const handleEdit = () => {
    WebApp?.HapticFeedback?.impactOccurred('light');
    setMode('edit');
  };

  const handleCancel = () => {
    WebApp?.HapticFeedback?.impactOccurred('light');
    setMode('view');
    if (transaction) {
      setFormData({
        category_id: transaction.category_id,
        subcategory_id: transaction.subcategory_id,
        note: transaction.note,
        performed_at: transaction.performed_at || transaction.created_at,
      });
    }
  };

  const handleSave = async () => {
    if (!transaction) return;

    WebApp?.HapticFeedback?.impactOccurred('medium');
    setLoading(true);

    try {
      await apiClient.updateTransaction(transaction.id, formData);
      WebApp?.HapticFeedback?.notificationOccurred('success');
      WebApp?.showAlert(t('transaction.updateSuccess'));
      setMode('view');
      onTransactionUpdated?.();
      onClose();
    } catch (err) {
      console.error('Failed to update transaction:', err);
      WebApp?.HapticFeedback?.notificationOccurred('error');
      WebApp?.showAlert(t('errors.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!transaction) return;

    WebApp?.HapticFeedback?.impactOccurred('medium');

    WebApp?.showConfirm(
      `${t('transaction.confirmDelete')}\n\n${t('transaction.confirmDeleteMessage')}`,
      async (confirmed) => {
        if (confirmed) {
          setLoading(true);
          try {
            await apiClient.deleteTransaction(transaction.id);
            WebApp?.HapticFeedback?.notificationOccurred('success');
            WebApp?.showAlert(t('transaction.deleteSuccess'));
            onTransactionDeleted?.();
            onClose();
          } catch (err) {
            console.error('Failed to delete transaction:', err);
            WebApp?.HapticFeedback?.notificationOccurred('error');
            WebApp?.showAlert(t('errors.deleteFailed'));
          } finally {
            setLoading(false);
          }
        }
      }
    );
  };

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
              <div className="px-4 py-4 space-y-5 max-h-[65vh] overflow-y-auto overscroll-contain">
                <div className="text-center space-y-2">
                  <div className="text-5xl">{displayEmoji}</div>
                  <h3 className="text-lg font-semibold text-foreground">{displayName}</h3>
                  <p
                    className={cn(
                      'text-3xl font-bold tabular-nums',
                      isPositive ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {isPositive ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount), transaction.currency_code, locale)}
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
                  <DetailRow
                    label={t('transaction.type')}
                    value={isIncome ? t('transaction.income') : t('transaction.expense')}
                    icon={isIncome ? '💰' : '💸'}
                    readOnly
                  />

                  {mode === 'view' ? (
                    <>
                      {category && <DetailRow label={t('transaction.category')} value={category.name} icon={category.emoji || '📁'} />}
                      {subcategory && <DetailRow label={t('transaction.subcategory')} value={subcategory.name} icon={subcategory.emoji || '📌'} />}
                    </>
                  ) : (
                    <>
                      <EditableSelectRow
                        label={t('transaction.category')}
                        value={formData.category_id}
                        options={categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji || '📁' }))}
                        onChange={(id) => {
                          setFormData((prev) => ({
                            ...prev,
                            category_id: id,
                            subcategory_id: undefined,
                          }));
                        }}
                        icon="📁"
                      />
                      <EditableSelectRow
                        label={t('transaction.subcategory')}
                        value={formData.subcategory_id}
                        options={filteredSubcategories.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji || '📌' }))}
                        onChange={(id) => setFormData((prev) => ({ ...prev, subcategory_id: id }))}
                        icon="📌"
                        placeholder={t('transaction.noSubcategories')}
                      />
                    </>
                  )}

                  {account && <DetailRow label={t('transaction.account')} value={account.name} icon="📊" readOnly />}

                  {mode === 'view' ? (
                    <DetailRow
                      label={t('transaction.dateTime')}
                      value={formatDateTime(transaction.performed_at || transaction.created_at, timezone, locale)}
                      icon="📅"
                    />
                  ) : (
                    <EditableDateTimeRow
                      label={t('transaction.dateTime')}
                      value={formData.performed_at || ''}
                      onChange={(value) => setFormData((prev) => ({ ...prev, performed_at: value }))}
                      icon="📅"
                    />
                  )}
                </div>

                {mode === 'view' ? (
                  transaction.note && (
                    <div className="bg-muted/40 rounded-2xl p-4 border border-border/50">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('transaction.note')}</h4>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{transaction.note}</p>
                    </div>
                  )
                ) : (
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border/50">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                      {t('transaction.note')} ({t('common.optional')})
                    </h4>
                    <textarea
                      value={formData.note || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder={t('transaction.notePlaceholder')}
                      rows={3}
                      className="w-full px-3 py-2 bg-background rounded-xl border-2 border-transparent focus:outline-none focus:border-primary resize-none text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-4 pb-4 pt-2 space-y-2 border-t border-border/50">
                {mode === 'view' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleEdit}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                      <Edit2 className="w-4 h-4" />
                      {t('transaction.edit')}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 rounded-xl font-semibold transition-all hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('transaction.delete')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-4 py-3 bg-muted text-foreground rounded-xl font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    >
                      {t('transaction.cancel')}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {t('transaction.save')}
                    </button>
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

function DetailRow({ label, value, icon, readOnly }: { label: string; value: string; icon: string; readOnly?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between py-1.5", readOnly && "opacity-60")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function EditableSelectRow({
  label,
  value,
  options,
  onChange,
  icon,
  placeholder,
}: {
  label: string;
  value?: number;
  options: { id: number; name: string; emoji: string }[];
  onChange: (id?: number) => void;
  icon: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="text-sm font-medium text-foreground bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-primary max-w-[180px]"
      >
        <option value="">{placeholder || '—'}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.emoji} {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function EditableDateTimeRow({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: string;
}) {
  // Convert to local datetime-local format
  const localValue = value ? new Date(value).toISOString().slice(0, 16) : '';

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <input
        type="datetime-local"
        value={localValue}
        onChange={(e) => onChange(new Date(e.target.value).toISOString())}
        className="text-sm font-medium text-foreground bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-primary"
      />
    </div>
  );
}
