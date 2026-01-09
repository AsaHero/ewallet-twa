import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: { name: string; balance?: number; is_default?: boolean }) => Promise<void>;
};

function normalizeDecimalInput(v: string) {
  // allow digits, comma, dot; keep only first decimal separator
  const raw = v.replace(/[^\d.,]/g, '');
  const firstSepIndex = raw.search(/[.,]/);
  if (firstSepIndex === -1) return raw;

  const intPart = raw.slice(0, firstSepIndex).replace(/[.,]/g, '');
  const fracPart = raw.slice(firstSepIndex + 1).replace(/[.,]/g, '');
  return `${intPart}.${fracPart}`; // normalize to dot for parsing
}

function parseOptionalNumber(v: string): number | undefined {
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

export function CreateAccountSheet({ open, onOpenChange, onCreate }: Props) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [balanceRaw, setBalanceRaw] = useState(''); // keep as string for UX
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // reset on close
  useEffect(() => {
    if (!open) {
      setName('');
      setBalanceRaw('');
      setIsDefault(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && !isSubmitting;
  }, [name, isSubmitting]);

  const handleClose = () => {
    if (!isSubmitting) onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const normalized = normalizeDecimalInput(balanceRaw);
      const balanceNum = parseOptionalNumber(normalized);

      await onCreate({
        name: name.trim(),
        balance: balanceNum,
        is_default: isDefault,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create account:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-2"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={handleSubmit}
              className="rounded-t-[28px] bg-background shadow-2xl border border-border/50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 pt-3 pb-3 border-b border-border/50">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-foreground truncate">
                        {t('accounts.createNew')}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate">
                        {t('accounts.createSubtitle')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95"
                    aria-label={t('common.close')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4 space-y-5">
                {/* Account name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">
                    {t('accounts.accountName')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('accounts.namePlaceholder')}
                    className={cn(
                      'w-full h-12 px-4 rounded-2xl bg-muted/25 border border-border/50',
                      'focus:outline-none focus:ring-2 focus:ring-primary/30',
                      'text-base'
                    )}
                    // ✅ no autoFocus
                    enterKeyHint="next"
                  />
                </div>

                {/* Initial balance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-sm font-medium text-foreground">
                      {t('accounts.initialBalance')}
                    </label>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                      {t('common.optional')}
                    </span>
                  </div>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={balanceRaw}
                    onChange={(e) => setBalanceRaw(e.target.value)}
                    placeholder="0"
                    className={cn(
                      'w-full h-12 px-4 rounded-2xl bg-muted/25 border border-border/50',
                      'focus:outline-none focus:ring-2 focus:ring-primary/30',
                      'text-base tabular-nums'
                    )}
                    enterKeyHint="done"
                  />

                  <p className="text-xs text-muted-foreground ml-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    {t('accounts.initialBalanceHint')}
                  </p>
                </div>

                {/* Default toggle */}
                <Card className="rounded-2xl border border-border/40 bg-muted/15 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {t('accounts.makeDefault')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('accounts.makeDefaultDescription')}
                      </p>
                    </div>

                    <Switch
                      checked={isDefault}
                      onCheckedChange={setIsDefault}
                      aria-label={t('accounts.makeDefault')}
                    />
                  </div>
                </Card>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-background/70 backdrop-blur-xl">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    'w-full h-12 rounded-2xl font-semibold transition-all shadow-lg',
                    'flex items-center justify-center gap-2',
                    canSubmit
                      ? 'bg-primary text-primary-foreground active:scale-[0.99] shadow-primary/20'
                      : 'bg-muted text-muted-foreground cursor-not-allowed shadow-transparent'
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isSubmitting ? t('common.loading') : t('accounts.create')}
                </button>

                <div className="h-safe-bottom" />
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
