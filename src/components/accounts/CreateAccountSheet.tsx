import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: { name: string; balance?: number; is_default?: boolean }) => Promise<void>;
};

export function CreateAccountSheet({ open, onOpenChange, onCreate }: Props) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setName('');
      setBalance('');
      setIsDefault(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const balanceNum = balance.trim() ? parseFloat(balance) : undefined;
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
            onClick={() => onOpenChange(false)}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={handleSubmit}
              className="rounded-t-3xl bg-background shadow-2xl border border-border/50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 pt-3 pb-2 border-b border-border/50">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
                <div className="mt-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    {t('accounts.createNew')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4 space-y-4">
                {/* Account Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">
                    {t('accounts.accountName')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('accounts.namePlaceholder')}
                    className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
                    autoFocus
                  />
                </div>

                {/* Initial Balance */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground ml-1">
                    {t('accounts.initialBalance')} <span className="text-xs">({t('common.optional')})</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
                  />
                </div>

                {/* Make Default Checkbox */}
                <Card className="p-4 bg-muted/20 border-border/40">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-5 h-5 rounded border-border/50 text-primary focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {t('accounts.makeDefault')}
                    </span>
                  </label>
                </Card>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-background/50 backdrop-blur-xl">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    'w-full h-12 rounded-2xl font-semibold transition-transform shadow-lg',
                    canSubmit
                      ? 'bg-primary text-primary-foreground active:scale-[0.99] shadow-primary/20'
                      : 'bg-muted text-muted-foreground cursor-not-allowed shadow-transparent'
                  )}
                >
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
