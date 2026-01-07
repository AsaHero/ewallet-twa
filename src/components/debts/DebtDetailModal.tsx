import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type { Debt } from '@/core/types';
import { apiClient } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface DebtDetailModalProps {
  debt: Debt | null;
  onClose: () => void;
  onDebtUpdated: () => void;
  locale?: string;
  timezone?: string;
}

function hapticSelect() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any)?.Telegram?.WebApp;
  try {
    tg?.HapticFeedback?.selectionChanged?.();
  } catch {
    // ignore
  }
}

export function DebtDetailModal({
  debt,
  onClose,
  onDebtUpdated,
  locale,
  timezone,
}: DebtDetailModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showConfirmPay, setShowConfirmPay] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  if (!debt) return null;

  const handleMarkPaid = async () => {
    hapticSelect();
    setShowConfirmPay(true);
  };

  const confirmMarkPaid = async () => {
    try {
      setLoading(true);
      await apiClient.payDebt(debt.id, {});
      setShowConfirmPay(false);
      onDebtUpdated();
      onClose();
      // Could show success toast here
    } catch (error) {
      console.error('Failed to mark debt as paid:', error);
      alert('Failed to mark debt as paid');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDebt = async () => {
    hapticSelect();
    setShowConfirmCancel(true);
  };

  const confirmCancelDebt = async () => {
    try {
      setLoading(true);
      await apiClient.cancelDebt(debt.id);
      setShowConfirmCancel(false);
      onDebtUpdated();
      onClose();
      // Could show success toast here
    } catch (error) {
      console.error('Failed to cancel debt:', error);
      alert('Failed to cancel debt');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    hapticSelect();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="w-full max-w-md bg-background rounded-t-3xl overflow-hidden shadow-xl"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">{t('debts.detail.title')}</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {/* Main info card */}
            <Card className="mb-4 border-border/40 bg-card/40">
              <CardContent className="p-4 space-y-3">
                {/* Person */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('debts.detail.person')}</p>
                  <p className="text-base font-semibold text-foreground">👤 {debt.person_name}</p>
                </div>

                {/* Amount */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('debts.detail.amount')}</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(debt.amount, debt.currency_code, locale)}
                  </p>
                </div>

                {/* Note */}
                {debt.note && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('debts.detail.note')}</p>
                    <p className="text-sm text-foreground">{debt.note}</p>
                  </div>
                )}

                {/* Due date */}
                {debt.due_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('debts.detail.dueDate')}</p>
                    <p className="text-sm text-foreground">
                      {formatDateTime(debt.due_date, timezone, locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('debts.detail.status')}</p>
                  <span
                    className={cn(
                      'inline-block px-2 py-1 rounded-full text-xs font-semibold',
                      debt.status === 'open' && 'bg-blue-500/10 text-blue-500',
                      debt.status === 'paid' && 'bg-green-500/10 text-green-500',
                      debt.status === 'cancelled' && 'bg-gray-500/10 text-gray-500'
                    )}
                  >
                    {t(`debts.status.${debt.status}`)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <div className="space-y-2 text-xs text-muted-foreground mb-4">
              <div className="flex justify-between">
                <span>{t('debts.detail.createdAt')}:</span>
                <span>{formatDateTime(debt.created_at, timezone, locale)}</span>
              </div>
              {debt.updated_at !== debt.created_at && (
                <div className="flex justify-between">
                  <span>{t('debts.detail.updatedAt')}:</span>
                  <span>{formatDateTime(debt.updated_at, timezone, locale)}</span>
                </div>
              )}
            </div>

            {/* Action buttons (only for open debts) */}
            {debt.status === 'open' && !showConfirmPay && !showConfirmCancel && (
              <div className="space-y-2">
                <button
                  onClick={handleMarkPaid}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  💰 {t('debts.actions.markPaid')}
                </button>
                <button
                  onClick={handleCancelDebt}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-red-500/10 text-red-500 font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  ❌ {t('debts.actions.cancel')}
                </button>
              </div>
            )}

            {/* Confirm pay */}
            {showConfirmPay && (
              <Card className="border-yellow-500/50 bg-yellow-500/10">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {t('debts.actions.confirmPay')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmMarkPaid}
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {t('debts.actions.markPaid')}
                    </button>
                    <button
                      onClick={() => setShowConfirmPay(false)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg bg-muted text-foreground font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      {t('transaction.cancel')}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirm cancel */}
            {showConfirmCancel && (
              <Card className="border-red-500/50 bg-red-500/10">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {t('debts.actions.confirmCancel')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmCancelDebt}
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {t('debts.actions.cancel')}
                    </button>
                    <button
                      onClick={() => setShowConfirmCancel(false)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg bg-muted text-foreground font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      {t('common.back')}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
