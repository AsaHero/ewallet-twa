import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Account } from '@/core/types';
import { cn } from '@/lib/utils';

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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-t-3xl bg-background shadow-2xl border border-border/50 overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-border/50">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
                <div className="mt-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">{title}</h2>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 max-h-[72vh] overflow-y-auto overscroll-contain space-y-2">
                <button
                  onClick={selectAll}
                  className={cn(
                    'w-full flex items-center justify-between rounded-2xl px-4 py-3 border transition-colors',
                    allSelected ? 'border-primary/50 bg-primary/10' : 'border-border/50 bg-card/40'
                  )}
                >
                  <div className="font-semibold text-sm">All accounts</div>
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

              <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-background/50 backdrop-blur-xl">
                <button
                  onClick={apply}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.99] transition-transform shadow-lg shadow-primary/20"
                >
                  Apply
                </button>
                <div className="h-safe-bottom" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
