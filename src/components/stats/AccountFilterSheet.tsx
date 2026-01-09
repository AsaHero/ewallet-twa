import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account } from '@/core/types';
import { cn } from '@/lib/utils';
import { BottomSheetShell } from '@/components/ui/BottomSheetShell';

export function AccountFilterSheet({
  open,
  onOpenChange,
  accounts,
  selectedIds,
  onApply,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: Account[];
  selectedIds: string[];
  onApply: (ids: string[]) => void;
  title: string;
}) {
  const { t } = useTranslation();
  const [local, setLocal] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (!open) return;
    setLocal(selectedIds);
  }, [open, selectedIds]);

  const allSelected = useMemo(() => local.length === 0, [local]);

  const toggle = (id: string) => {
    setLocal((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const selectAll = () => setLocal([]);

  const apply = () => {
    onApply(local);
    onOpenChange(false);
  };

  const footer = (
    <button
      onClick={apply}
      className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.99] transition-transform shadow-lg shadow-primary/20"
    >
      {t('stats.apply')}
    </button>
  );

  return (
    <BottomSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={footer}
    >
      <div className="space-y-2">
        <button
          onClick={selectAll}
          className={cn(
            'w-full flex items-center justify-between rounded-2xl px-4 py-3 border transition-colors',
            allSelected ? 'border-primary/50 bg-primary/10' : 'border-border/50 bg-card/40'
          )}
        >
          <div className="font-semibold text-sm">{t('stats.allAccounts')}</div>
          {allSelected && <Check className="w-5 h-5 text-primary" />}
        </button>

        {accounts.map((a) => {
          const checked = local.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className={cn(
                'w-full flex items-center justify-between rounded-2xl px-4 py-3 border transition-colors',
                checked ? 'border-primary/50 bg-primary/10' : 'border-border/50 bg-card/40'
              )}
            >
              <div className="min-w-0 text-left">
                <div className="font-semibold text-sm truncate">{a.name}</div>
                {'currency_code' in a && (a as any).currency_code ? (
                  <div className="text-xs text-muted-foreground">{(a as any).currency_code}</div>
                ) : null}
              </div>
              {checked && <Check className="w-5 h-5 text-primary" />}
            </button>
          );
        })}
      </div>
    </BottomSheetShell>
  );
}
