import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, SlidersHorizontal } from 'lucide-react';

import type { Account, Category } from '@/core/types';
import { cn } from '@/lib/utils';
import { BottomSheetShell } from '@/components/ui/BottomSheetShell';

export type HistoryFilters = {
  search: string;
  account_ids: string[];
  category_ids: number[];
  subcategory_ids?: number[];
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

function normalizeDecimalInput(v: string) {
  const raw = v.replace(/[^\d.,]/g, '');
  const firstSepIndex = raw.search(/[.,]/);
  if (firstSepIndex === -1) return raw;

  const intPart = raw.slice(0, firstSepIndex).replace(/[.,]/g, '');
  const fracPart = raw.slice(firstSepIndex + 1).replace(/[.,]/g, '');
  return `${intPart}.${fracPart}`;
}

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
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

  // UI-only states
  const [catSearch, setCatSearch] = useState('');
  const [accSearch, setAccSearch] = useState('');
  const [minAmountRaw, setMinAmountRaw] = useState('');
  const [maxAmountRaw, setMaxAmountRaw] = useState('');

  useEffect(() => {
    if (!open) return;

    setDraft(value);
    setCatSearch('');
    setAccSearch('');
    setMinAmountRaw(value.min_amount !== undefined ? String(value.min_amount) : '');
    setMaxAmountRaw(value.max_amount !== undefined ? String(value.max_amount) : '');
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

  const handleReset = () => {
    setDraft({
      search: '',
      account_ids: [],
      category_ids: [],
      subcategory_ids: [],
      min_amount: undefined,
      max_amount: undefined,
    });
    setCatSearch('');
    setAccSearch('');
    setMinAmountRaw('');
    setMaxAmountRaw('');
  };

  const handleApply = () => {
    const minN = parseOptionalNumber(normalizeDecimalInput(minAmountRaw));
    const maxN = parseOptionalNumber(normalizeDecimalInput(maxAmountRaw));

    onApply({
      search: draft.search ?? '',
      account_ids: draft.account_ids ?? [],
      category_ids: draft.category_ids ?? [],
      subcategory_ids: draft.subcategory_ids ?? [],
      min_amount: minN,
      max_amount: maxN,
    });

    onOpenChange(false);
  };

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={handleReset}
        className={cn(
          'h-12 rounded-2xl font-semibold',
          'bg-muted text-foreground hover:opacity-90 active:scale-[0.99] transition-all'
        )}
      >
        {t('history.filters.reset')}
      </button>

      <button
        type="button"
        onClick={handleApply}
        className={cn(
          'h-12 rounded-2xl font-semibold shadow-lg',
          'bg-primary text-primary-foreground active:scale-[0.99] transition-all shadow-primary/20'
        )}
      >
        {t('history.filters.apply')}
      </button>

      <div className="h-safe-bottom col-span-2" />
    </div>
  );

  return (
    <BottomSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={t('history.filters.title')}
      subtitle={t('history.filters.subtitle')}
      icon={<SlidersHorizontal className="w-5 h-5 text-primary" />}
      footer={footer}
    >
      <div className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('history.filters.search')}
          </div>
          <input
            value={draft.search}
            onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
            placeholder={t('history.filters.searchPlaceholder')}
            className={cn(
              'w-full h-11 px-4 rounded-2xl bg-muted/25 border border-border/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/25 text-sm'
            )}
          />
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {t('history.filters.amount')}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground ml-1">
                {t('history.filters.min')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={minAmountRaw}
                onChange={(e) => setMinAmountRaw(e.target.value)}
                className={cn(
                  'h-11 w-full px-4 rounded-2xl bg-muted/25 border border-border/50',
                  'focus:outline-none focus:ring-2 focus:ring-primary/25 text-sm tabular-nums'
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground ml-1">
                {t('history.filters.max')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={maxAmountRaw}
                onChange={(e) => setMaxAmountRaw(e.target.value)}
                className={cn(
                  'h-11 w-full px-4 rounded-2xl bg-muted/25 border border-border/50',
                  'focus:outline-none focus:ring-2 focus:ring-primary/25 text-sm tabular-nums'
                )}
              />
            </div>
          </div>
        </div>

        {/* Accounts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">
              {t('history.filters.accounts')}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('history.filters.selected', { count: draft.account_ids.length })}
            </div>
          </div>

          <input
            value={accSearch}
            onChange={(e) => setAccSearch(e.target.value)}
            placeholder={t('history.filters.findAccount')}
            className={cn(
              'w-full h-10 px-4 rounded-2xl bg-muted/25 border border-border/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/25 text-sm'
            )}
          />

          <div className="rounded-3xl border border-border/40 bg-card/30 overflow-hidden">
            {filteredAccounts.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                {t('history.filters.noAccounts')}
              </div>
            ) : (
              filteredAccounts.map((a, idx) => {
                const on = draft.account_ids.includes(a.id);
                const isLast = idx === filteredAccounts.length - 1;

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAccount(a.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left flex items-center justify-between gap-3',
                      'transition-colors hover:bg-muted/20 active:bg-muted/30',
                      !isLast && 'border-b border-border/30'
                    )}
                  >
                    <span className="text-sm font-medium text-foreground truncate">
                      {a.name}
                    </span>

                    <span
                      className={cn(
                        'w-6 h-6 rounded-full border flex items-center justify-center shrink-0',
                        on
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border/50 text-transparent'
                      )}
                    >
                      <Check className="w-4 h-4" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">
              {t('history.filters.categories')}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('history.filters.selected', { count: draft.category_ids.length })}
            </div>
          </div>

          <input
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            placeholder={t('history.filters.findCategory')}
            className={cn(
              'w-full h-10 px-4 rounded-2xl bg-muted/25 border border-border/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/25 text-sm'
            )}
          />

          <div className="rounded-3xl border border-border/40 bg-card/30 overflow-hidden">
            {filteredCategories.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                {t('history.filters.noCategories')}
              </div>
            ) : (
              filteredCategories.map((c, idx) => {
                const on = draft.category_ids.includes(c.id);
                const isLast = idx === filteredCategories.length - 1;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left flex items-center justify-between gap-3',
                      'transition-colors hover:bg-muted/20 active:bg-muted/30',
                      !isLast && 'border-b border-border/30'
                    )}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-base">{c.emoji || '📁'}</span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {c.name}
                      </span>
                    </div>

                    <span
                      className={cn(
                        'w-6 h-6 rounded-full border flex items-center justify-center shrink-0',
                        on
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border/50 text-transparent'
                      )}
                    >
                      <Check className="w-4 h-4" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </BottomSheetShell>
  );
}
