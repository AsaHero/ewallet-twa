import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BottomSheetShell } from '@/components/ui/BottomSheetShell';

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

  const footer = (
    <button
      type="submit"
      onClick={handleSubmit}
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
  );

  return (
    <BottomSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={t('accounts.createNew')}
      subtitle={t('accounts.createSubtitle')}
      icon={<Plus className="w-5 h-5 text-primary" />}
      footer={footer}
      closeOnBackdrop={!isSubmitting}
    >
      <div className="space-y-5">
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
    </BottomSheetShell>
  );
}
