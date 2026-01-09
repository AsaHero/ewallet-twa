import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { User, Account } from '@/core/types';

import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { Skeleton } from '@/components/ui/skeleton';

import { ExploreDonut, type ExploreItem } from '@/components/stats/ExploreDonut';
import { ExploreRankList } from '@/components/stats/ExploreRankList';
import { CreateAccountSheet } from '@/components/accounts/CreateAccountSheet';

export default function AccountsPage() {
  const { t } = useTranslation();
  const { isReady, haptic, WebApp } = useTelegramWebApp();

  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const currencyCode = user?.currency_code || 'USD';
  const locale = user?.language_code;

  // Init load (me + accounts)
  useEffect(() => {
    if (!isReady) return;
    (async () => {
      try {
        const [me, acc] = await Promise.all([apiClient.getMe(), apiClient.getAccounts()]);
        setUser(me);
        setAccounts(acc);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, [isReady]);

  // Convert accounts to donut items
  const accountItems: ExploreItem[] = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return accounts.map((acc) => ({
      id: acc.id as unknown as number, // ExploreItem expects number id
      name: acc.name,
      emoji: acc.is_default ? '⭐' : '💳',
      total: acc.balance,
      count: 1, // We'll show "Default" instead of tx count
      share: totalBalance > 0 ? acc.balance / totalBalance : 0,
    }));
  }, [accounts]);

  const totals = useMemo(() => {
    const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    return { total, count: accounts.length };
  }, [accounts]);

  // Create account handler
  const handleCreateAccount = useCallback(async (data: { name: string; balance?: number; is_default?: boolean }) => {
    try {
      const newAccount = await apiClient.createAccount(data);
      setAccounts((prev) => [...prev, newAccount]);
      haptic?.notificationOccurred?.('success');
      WebApp.showAlert?.(t('accounts.createSuccess'));
    } catch (error) {
      console.error('Failed to create account:', error);
      haptic?.notificationOccurred?.('error');
      WebApp.showAlert?.(t('errors.saveFailed'));
      throw error;
    }
  }, [haptic, WebApp, t]);

  // Delete account handler
  const handleDeleteAccount = useCallback(async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    // Confirm deletion
    const confirmed = confirm(
      `${t('accounts.deleteConfirm')}\n\n${t('accounts.deleteMessage')}`
    );
    if (!confirmed) return;

    try {
      await apiClient.deleteAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setSelectedAccountId(null);
      haptic?.notificationOccurred?.('success');
      WebApp.showAlert?.(t('accounts.deleteSuccess'));
    } catch (error) {
      console.error('Failed to delete account:', error);
      haptic?.notificationOccurred?.('error');
      WebApp.showAlert?.(t('errors.deleteFailed'));
    }
  }, [accounts, haptic, WebApp, t]);

  // Donut select handler
  const onSelectDonut = (id: number | null) => {
    haptic?.selectionChanged?.();
    setSelectedAccountId(id !== null ? String(id) : null);
  };

  // Donut drill-down (second tap) = delete
  const onDrillDownDonut = (id: number) => {
    haptic?.impactOccurred?.('light');
    handleDeleteAccount(String(id));
  };

  // List tap handler (tap once to select, second tap to delete)
  const onSelectFromList = (id: number) => {
    const accountId = String(id);

    if (selectedAccountId === accountId) {
      // Second tap = delete
      haptic?.impactOccurred?.('light');
      handleDeleteAccount(accountId);
      return;
    }

    // First tap = select
    haptic?.selectionChanged?.();
    setSelectedAccountId(accountId);
  };

  if (!isReady || loadingInit) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-safe-top" />
        <div className="h-14" />
        <div className="px-4 pb-8 max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="h-safe-top" />
      <div className="h-14" />

      <div className="px-4 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <header className="pt-2 pb-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
          <div className="mt-3 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>

            <button
              onClick={() => setCreateSheetOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {t('accounts.createNew')}
            </button>
          </div>
        </header>

        {/* Donut Chart */}
        <div className="mt-4">
          <ExploreDonut
            title={t('accounts.totalBalance')}
            loading={false}
            items={accountItems}
            totals={totals}
            selectedId={selectedAccountId !== null ? Number(selectedAccountId) : null}
            onSelect={onSelectDonut}
            onDrillDown={onDrillDownDonut}
            currencyCode={currencyCode}
            locale={locale}
          />
        </div>

        {/* Account List */}
        <div className="mt-4">
          <ExploreRankList
            title={t('common.accounts')}
            items={accountItems}
            totals={totals}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
            selectedId={selectedAccountId !== null ? Number(selectedAccountId) : null}
            onSelect={onSelectFromList}
            currencyCode={currencyCode}
            locale={locale}
          />
        </div>
      </div>

      {/* Create Account Sheet */}
      <CreateAccountSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        onCreate={handleCreateAccount}
      />

      <div className="h-safe-bottom" />
    </div>
  );
}
