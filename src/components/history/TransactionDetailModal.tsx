import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Save, Trash2 } from 'lucide-react';

import type { Transaction, Category, Subcategory, Account } from '@/core/types';
import { apiClient } from '@/api/client';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { BottomSheetShell } from '@/components/ui/BottomSheetShell';

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
  performed_at?: string; // ISO
}

function clampText(s: string, max = 56) {
  const v = (s || '').trim();
  if (!v) return '';
  return v.length <= max ? v : v.slice(0, max - 1) + '…';
}

function toLocalDateTimeInputValue(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDateTimeInputValue(localValue: string) {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
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

  const open = !!transaction;

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EditableFields>({});

  const category = transaction ? categories.find((c) => c.id === transaction.category_id) : undefined;
  const subcategory = transaction ? subcategories.find((s) => s.id === transaction.subcategory_id) : undefined;
  const account = transaction ? accounts.find((a) => a.id === transaction.account_id) : undefined;

  const displayEmoji = subcategory?.emoji || category?.emoji || '📌';
  const isIncome = transaction?.type === 'deposit';
  const amount = transaction?.amount ?? 0;
  const isPositive = amount >= 0;

  const titleText = useMemo(() => {
    if (!transaction) return '';
    const base =
      (transaction.note || '').trim() ||
      (isIncome ? t('transaction.income') : t('transaction.expense'));
    return clampText(base, 64);
  }, [transaction, isIncome, t]);

  const subtitleText = useMemo(() => {
    if (!transaction) return '';
    const acc = account?.name || t('common.unknown');
    const dt = formatDateTime(transaction.performed_at || transaction.created_at, timezone, locale);
    return `${acc} • ${dt}`;
  }, [transaction, account?.name, timezone, locale, t]);

  const hasFx =
    transaction?.original_amount !== undefined &&
    !!transaction?.original_currency_code &&
    transaction?.original_currency_code !== transaction?.currency_code;

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

  const filteredSubcategories = useMemo(() => {
    if (!formData.category_id) return subcategories;
    return subcategories.filter((s) => s.category_id === formData.category_id);
  }, [formData.category_id, subcategories]);

  const handleClose = () => {
    onClose();
  };

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
      handleClose();
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
        if (!confirmed) return;

        setLoading(true);
        try {
          await apiClient.deleteTransaction(transaction.id);
          WebApp?.HapticFeedback?.notificationOccurred('success');
          WebApp?.showAlert(t('transaction.deleteSuccess'));
          onTransactionDeleted?.();
          handleClose();
        } catch (err) {
          console.error('Failed to delete transaction:', err);
          WebApp?.HapticFeedback?.notificationOccurred('error');
          WebApp?.showAlert(t('errors.deleteFailed'));
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const footer =
    mode === 'view' ? (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleEdit}
          className={cn(
            'h-12 rounded-2xl font-semibold',
            'bg-primary text-primary-foreground shadow-lg shadow-primary/20',
            'active:scale-[0.99] transition-all flex items-center justify-center gap-2'
          )}
        >
          <Edit2 className="w-4 h-4" />
          {t('transaction.edit')}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className={cn(
            'h-12 rounded-2xl font-semibold',
            'bg-muted text-rose-500 hover:bg-muted/80',
            'active:scale-[0.99] transition-all flex items-center justify-center gap-2',
            loading && 'opacity-60 cursor-not-allowed'
          )}
        >
          <Trash2 className="w-4 h-4" />
          {t('transaction.delete')}
        </button>

        <div className="h-safe-bottom col-span-2" />
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className={cn(
            'h-12 rounded-2xl font-semibold bg-muted text-foreground',
            'active:scale-[0.99] transition-all',
            loading && 'opacity-60 cursor-not-allowed'
          )}
        >
          {t('transaction.cancel')}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className={cn(
            'h-12 rounded-2xl font-semibold',
            'bg-primary text-primary-foreground shadow-lg shadow-primary/20',
            'active:scale-[0.99] transition-all flex items-center justify-center gap-2',
            loading && 'opacity-60 cursor-not-allowed'
          )}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('transaction.save')}
        </button>

        <div className="h-safe-bottom col-span-2" />
      </div>
    );

  return (
    <BottomSheetShell
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
      title={t('transaction.detail')}
      subtitle={subtitleText}
      icon={
        <div className="w-9 h-9 rounded-2xl bg-muted/25 border border-border/40 flex items-center justify-center text-lg">
          {displayEmoji}
        </div>
      }
      footer={footer}
    >
      {!transaction ? null : (
        <div className="space-y-5">
          {/* Amount */}
          <div className="text-center space-y-2">
            <h3 className="text-[15px] font-semibold text-foreground truncate px-2">
              {titleText}
            </h3>

            <p
              className={cn(
                'font-extrabold tabular-nums tracking-tight',
                'text-[clamp(22px,7vw,34px)] break-words',
                isPositive ? 'text-emerald-500' : 'text-rose-500'
              )}
            >
              {isPositive ? '+' : '-'}
              {formatCurrency(Math.abs(amount), transaction.currency_code, locale)}
            </p>
          </div>

          {/* FX */}
          {hasFx && (
            <div className="rounded-3xl border border-border/40 bg-card/30 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('transaction.currencyConversion')}
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {t('transaction.original')}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(
                      transaction.original_amount!,
                      transaction.original_currency_code!,
                      locale
                    )}
                  </span>
                </div>

                {transaction.fx_rate && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {t('transaction.fxRate')}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {transaction.fx_rate.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="rounded-3xl border border-border/40 bg-card/30 p-4 space-y-3">
            <DetailRow
              label={t('transaction.type')}
              value={isIncome ? t('transaction.income') : t('transaction.expense')}
              icon={isIncome ? '💰' : '💸'}
              readOnly
            />

            {mode === 'view' ? (
              <>
                {category && (
                  <DetailRow label={t('transaction.category')} value={category.name} icon={category.emoji || '📁'} />
                )}
                {subcategory && (
                  <DetailRow
                    label={t('transaction.subcategory')}
                    value={subcategory.name}
                    icon={subcategory.emoji || '📌'}
                  />
                )}
              </>
            ) : (
              <>
                <EditableSelectRow
                  label={t('transaction.category')}
                  value={formData.category_id}
                  options={categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji || '📁' }))}
                  onChange={(id) =>
                    setFormData((prev) => ({ ...prev, category_id: id, subcategory_id: undefined }))
                  }
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

            {account && (
              <DetailRow label={t('transaction.account')} value={account.name} icon="📊" readOnly />
            )}

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
                onChange={(v) => setFormData((prev) => ({ ...prev, performed_at: v }))}
                icon="📅"
              />
            )}
          </div>

          {/* Note */}
          {mode === 'view' ? (
            transaction.note && (
              <div className="rounded-3xl border border-border/40 bg-card/30 p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t('transaction.note')}
                </h4>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {transaction.note}
                </p>
              </div>
            )
          ) : (
            <div className="rounded-3xl border border-border/40 bg-card/30 p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t('transaction.note')} • {t('common.optional')}
              </h4>
              <textarea
                value={formData.note || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                placeholder={t('transaction.notePlaceholder')}
                rows={3}
                className={cn(
                  'w-full px-4 py-3 rounded-2xl bg-background border border-border/50',
                  'focus:outline-none focus:ring-2 focus:ring-primary/25',
                  'text-sm resize-none'
                )}
              />
            </div>
          )}
        </div>
      )}
    </BottomSheetShell>
  );
}

function DetailRow({
  label,
  value,
  icon,
  readOnly,
}: {
  label: string;
  value: string;
  icon: string;
  readOnly?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-1.5', readOnly && 'opacity-70')}>
      <div className="min-w-0 flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="min-w-0 text-sm font-semibold text-foreground truncate">{value}</span>
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
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0 flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>

      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className={cn(
          'max-w-[190px] h-10 px-3 rounded-2xl bg-background border border-border/50',
          'text-sm font-semibold text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/25'
        )}
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
  const localValue = toLocalDateTimeInputValue(value);

  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0 flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>

      <input
        type="datetime-local"
        value={localValue}
        onChange={(e) => onChange(fromLocalDateTimeInputValue(e.target.value))}
        className={cn(
          'h-10 px-3 rounded-2xl bg-background border border-border/50',
          'text-sm font-semibold text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/25'
        )}
      />
    </div>
  );
}
