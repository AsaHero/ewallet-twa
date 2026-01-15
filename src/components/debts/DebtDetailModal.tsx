import { useTranslation } from 'react-i18next';
import { Edit2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Debt } from '@/core/types';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiClient } from '@/api/client';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { formatDueDate } from '@/lib/debtHelpers';
import { BottomSheetShell } from '@/components/ui/BottomSheetShell';

interface DebtDetailModalProps {
  debt: Debt | null;
  onClose: () => void;
  onDebtUpdated: () => void;
  locale?: string;
  timezone?: string;
}

interface EditableFields {
  amount?: number;
  name?: string;
  note?: string;
  due_at?: string;
}

export function DebtDetailModal({
  debt,
  onClose,
  onDebtUpdated,
  locale,
  timezone,
}: DebtDetailModalProps) {
  const { t } = useTranslation();
  const { WebApp } = useTelegramWebApp();
  const isOpen = !!debt;

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EditableFields>({});

  const isBorrow = debt?.type === 'borrow';
  const dueDateText = debt?.due_at ? formatDueDate(debt.due_at, t) : t('debts.noDueDate');

  // Reset mode when debt changes
  useEffect(() => {
    setMode('view');
    if (debt) {
      setFormData({
        amount: debt.amount,
        name: debt.name,
        note: debt.note,
        due_at: debt.due_at,
      });
    }
  }, [debt]);

  const handleEdit = () => {
    WebApp?.HapticFeedback?.impactOccurred('light');
    setMode('edit');
  };

  const handleCancel = () => {
    WebApp?.HapticFeedback?.impactOccurred('light');
    setMode('view');
    if (debt) {
      setFormData({
        amount: debt.amount,
        name: debt.name,
        note: debt.note,
        due_at: debt.due_at,
      });
    }
  };

  const handleSave = async () => {
    if (!debt) return;

    WebApp?.HapticFeedback?.impactOccurred('medium');
    setLoading(true);

    try {
      await apiClient.updateDebt(debt.id, formData);
      WebApp?.HapticFeedback?.notificationOccurred('success');
      WebApp?.showAlert(t('debts.actions.updateSuccess'));
      setMode('view');
      onDebtUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to update debt:', err);
      WebApp?.HapticFeedback?.notificationOccurred('error');
      WebApp?.showAlert('Failed to update debt');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = () => {
    if (!debt) return;

    WebApp?.HapticFeedback?.impactOccurred('medium');

    WebApp?.showConfirm(t('debts.actions.confirmPay'), async (confirmed) => {
      if (confirmed) {
        setLoading(true);
        try {
          await apiClient.payDebt(debt.id, { paid_at: new Date().toISOString() });
          WebApp?.HapticFeedback?.notificationOccurred('success');
          WebApp?.showAlert(t('debts.actions.paySuccess'));
          onDebtUpdated();
          onClose();
        } catch (err) {
          console.error('Failed to mark debt as paid:', err);
          WebApp?.HapticFeedback?.notificationOccurred('error');
          WebApp?.showAlert('Failed to mark debt as paid');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleCancelDebt = () => {
    if (!debt) return;

    WebApp?.HapticFeedback?.impactOccurred('medium');

    WebApp?.showConfirm(t('debts.actions.confirmCancel'), async (confirmed) => {
      if (confirmed) {
        setLoading(true);
        try {
          await apiClient.cancelDebt(debt.id);
          WebApp?.HapticFeedback?.notificationOccurred('success');
          WebApp?.showAlert(t('debts.actions.cancelSuccess'));
          onDebtUpdated();
          onClose();
        } catch (err) {
          console.error('Failed to cancel debt:', err);
          WebApp?.HapticFeedback?.notificationOccurred('error');
          WebApp?.showAlert('Failed to cancel debt');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const footer =
    debt?.status === 'open' ? (
      <div className="space-y-2">
        {mode === 'view' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center justify-center gap-2 h-12 bg-primary text-primary-foreground rounded-2xl font-semibold transition-all active:scale-[0.99] shadow-lg shadow-primary/20"
            >
              <Edit2 className="w-4 h-4" />
              {t('debts.actions.edit')}
            </button>
            <button
              onClick={handleMarkPaid}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-12 bg-green-500/10 text-green-500 rounded-2xl font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
            >
              💰 {t('debts.actions.markPaid')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="h-12 bg-muted text-foreground rounded-2xl font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {t('transaction.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-12 bg-primary text-primary-foreground rounded-2xl font-semibold transition-all active:scale-[0.99] shadow-lg shadow-primary/20 disabled:opacity-50"
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
        {mode === 'view' && (
          <button
            onClick={handleCancelDebt}
            disabled={loading}
            className="w-full h-11 bg-red-500/10 text-red-500 rounded-2xl font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {t('debts.actions.cancel')}
          </button>
        )}
      </div>
    ) : undefined;

  return (
    <BottomSheetShell
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={t('debts.detail.title')}
      footer={footer}
    >
      {debt && (
        <div className="space-y-5">
          {mode === 'view' ? (
            <>
              <div className="text-center space-y-2">
                <div className="text-5xl">👤</div>
                <h3 className="text-lg font-semibold text-foreground">{debt.name}</h3>
              </div>

              <div className="bg-card/40 border border-border/50 rounded-2xl p-4 space-y-3">
                <DetailRow
                  label={t('debts.detail.amount')}
                  value={formatCurrency(debt.amount, debt.currency_code, locale)}
                  icon="💰"
                />

                <DetailRow
                  label={t('debts.detail.status')}
                  value={t(`debts.status.${debt.status}`)}
                  icon={debt.status === 'open' ? '🟢' : debt.status === 'paid' ? '✅' : '❌'}
                />

                <DetailRow
                  label={t('transaction.type')}
                  value={t(isBorrow ? 'debts.borrow' : 'debts.lend')}
                  icon={isBorrow ? '📥' : '📤'}
                />

                <DetailRow
                  label={t('debts.detail.dueDate')}
                  value={dueDateText}
                  icon="📅"
                />

                <DetailRow
                  label={t('debts.detail.createdAt')}
                  value={formatDateTime(debt.created_at, timezone, locale)}
                  icon="🕐"
                />
              </div>

              {debt.note && (
                <div className="bg-muted/40 rounded-2xl p-4 border border-border/50">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('debts.detail.note')}</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{debt.note}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="text-5xl">👤</div>
              </div>

              <div className="bg-card/40 border border-border/50 rounded-2xl p-4 space-y-3">
                <EditableTextRow
                  label={t('debts.detail.person')}
                  value={formData.name || ''}
                  onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                  icon="👤"
                />

                <EditableNumberRow
                  label={t('debts.detail.amount')}
                  value={formData.amount || 0}
                  onChange={(value) => setFormData((prev) => ({ ...prev, amount: value }))}
                  icon="💰"
                />

                <EditableDateRow
                  label={t('debts.detail.dueDate')}
                  value={formData.due_at || ''}
                  onChange={(value) => setFormData((prev) => ({ ...prev, due_at: value }))}
                  icon="📅"
                />

                <DetailRow
                  label={t('transaction.type')}
                  value={t(isBorrow ? 'debts.borrow' : 'debts.lend')}
                  icon={isBorrow ? '📥' : '📤'}
                  readOnly
                />
              </div>

              <div className="bg-muted/40 rounded-2xl p-4 border border-border/50">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  {t('debts.detail.note')} ({t('common.optional')})
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
            </>
          )}
        </div>
      )}
    </BottomSheetShell>
  );
}

function DetailRow({ label, value, icon, readOnly }: { label: string; value: string; icon: string; readOnly?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between py-1.5", readOnly && "opacity-60")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

function EditableTextRow({
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
  return (
    <div className="flex items-center justify-between py-1.5 gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'text-sm font-medium text-foreground bg-background border border-border/50',
          'rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/25',
          'max-w-[180px]'
        )}
      />
    </div>
  );
}

function EditableNumberRow({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn(
          'text-sm font-medium text-foreground bg-background border border-border/50',
          'rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/25',
          'max-w-[120px]'
        )}
      />
    </div>
  );
}

function EditableDateRow({
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
  // Convert to local date format
  const localValue = value ? new Date(value).toISOString().slice(0, 10) : '';

  return (
    <div className="flex items-center justify-between py-1.5 gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <input
        type="date"
        value={localValue}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        className={cn(
          'text-sm font-medium text-foreground bg-background border border-border/50',
          'rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/25'
        )}
      />
    </div>
  );
}
