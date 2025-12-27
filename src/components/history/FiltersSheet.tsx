import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Account, Category } from '@/core/types';
import { cn } from '@/lib/utils';

export type HistoryFilters = {
  search: string;
  account_ids: string[];
  category_ids: number[];
  min_amount?: number;
  max_amount?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  accounts: Account[];
  categories: Category[];

  value: HistoryFilters;
  onApply: (v: HistoryFilters) => void;
};

function clampNumber(value: string) {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function FiltersSheet({
  open,
  onOpenChange,
  accounts,
  categories,
  value,
  onApply,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<HistoryFilters>(value);
  const [catSearch, setCatSearch] = useState('');
  const [accSearch, setAccSearch] = useState('');

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => (c.name || '').toLowerCase().includes(q));
  }, [categories, catSearch]);

  const filteredAccounts = useMemo(() => {
    const q = accSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => (a.name || '').toLowerCase().includes(q));
  }, [accounts, accSearch]);

  const toggleAccount = (id: string) => {
    setDraft((d) => ({
      ...d,
      account_ids: d.account_ids.includes(id)
        ? d.account_ids.filter((x) => x !== id)
        : [...d.account_ids, id],
    }));
  };

  const toggleCategory = (id: number) => {
    setDraft((d) => ({
      ...d,
      category_ids: d.category_ids.includes(id)
        ? d.category_ids.filter((x) => x !== id)
        : [...d.category_ids, id],
    }));
  };

  const reset = () => {
    setDraft({ search: '', account_ids: [], category_ids: [], min_amount: undefined, max_amount: undefined });
    setCatSearch('');
    setAccSearch('');
  };

  const apply = () => {
    onApply({
      search: draft.search ?? '',
      account_ids: draft.account_ids ?? [],
      category_ids: draft.category_ids ?? [],
      min_amount: draft.min_amount,
      max_amount: draft.max_amount,
    });
    onOpenChange(false);
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
            <div className="rounded-t-3xl bg-background shadow-2xl border border-border/50">
              {/* Header */}
              <div className="px-4 pt-3 pb-2 border-b border-border/50">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">{t('history.filters.title')}</h2>
                    <button
                      onClick={reset}
                      className="text-xs px-2 py-1 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                    >
                      {t('history.filters.reset')}
                    </button>
                  </div>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4 max-h-[72vh] overflow-y-auto overscroll-contain space-y-5">
                {/* Search */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">{t('history.filters.search')}</div>
                  <input
                    value={draft.search}
                    onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
                    placeholder={t('history.filters.searchPlaceholder')}
                    className={cn(
                      'w-full h-11 px-3 rounded-2xl bg-muted/40 border border-border/50',
                      'focus:outline-none focus:ring-2 focus:ring-primary/30'
                    )}
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">{t('history.filters.amount')}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      inputMode="decimal"
                      placeholder={t('history.filters.min')}
                      value={draft.min_amount ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, min_amount: clampNumber(e.target.value) }))}
                      className="h-11 px-3 rounded-2xl bg-muted/40 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      inputMode="decimal"
                      placeholder={t('history.filters.max')}
                      value={draft.max_amount ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, max_amount: clampNumber(e.target.value) }))}
                      className="h-11 px-3 rounded-2xl bg-muted/40 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Accounts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-foreground">{t('history.filters.accounts')}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('history.filters.selected', { count: draft.account_ids.length })}
                    </div>
                  </div>
                  <input
                    value={accSearch}
                    onChange={(e) => setAccSearch(e.target.value)}
                    placeholder={t('history.filters.findAccount')}
                    className="w-full h-10 px-3 rounded-2xl bg-muted/40 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex flex-wrap gap-2">
                    {filteredAccounts.map((a) => {
                      const on = draft.account_ids.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggleAccount(a.id)}
                          className={cn(
                            'px-3 py-2 rounded-2xl text-sm border transition-all',
                            on
                              ? 'bg-primary text-primary-foreground border-primary/30'
                              : 'bg-card/50 hover:bg-card/70 border-border/50'
                          )}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                    {filteredAccounts.length === 0 && (
                      <div className="text-sm text-muted-foreground py-2">{t('history.filters.noAccounts')}</div>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-foreground">{t('history.filters.categories')}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('history.filters.selected', { count: draft.category_ids.length })}
                    </div>
                  </div>
                  <input
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder={t('history.filters.findCategory')}
                    className="w-full h-10 px-3 rounded-2xl bg-muted/40 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex flex-wrap gap-2">
                    {filteredCategories.map((c) => {
                      const on = draft.category_ids.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCategory(c.id)}
                          className={cn(
                            'px-3 py-2 rounded-2xl text-sm border transition-all flex items-center gap-2',
                            on
                              ? 'bg-primary text-primary-foreground border-primary/30'
                              : 'bg-card/50 hover:bg-card/70 border-border/50'
                          )}
                        >
                          <span>{c.emoji || '📁'}</span>
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                    {filteredCategories.length === 0 && (
                      <div className="text-sm text-muted-foreground py-2">{t('history.filters.noCategories')}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4 pt-3 border-t border-border/50">
                <button
                  onClick={apply}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.99] transition-transform"
                >
                  {t('history.filters.apply')}
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
