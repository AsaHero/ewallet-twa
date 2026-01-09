import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { apiClient } from '@/api/client';
import type { User, Account } from '@/core/types';

import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { AnimatedBalance } from '@/components/accounts/AnimatedBalance';
import { AccountListCard } from '@/components/accounts/AccountListCard';
import { CreateAccountSheet } from '@/components/accounts/CreateAccountSheet';
import { AccountActionsSheet } from '@/components/accounts/AccountActionsSheet';

export default function AccountsPage() {
  const { t } = useTranslation();
  const { isReady, haptic, WebApp } = useTelegramWebApp();

  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const currencyCode = user?.currency_code || 'USD';
  const locale = user?.language_code;

  const totalBalance = useMemo(() => {
    const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    console.log('[AccountsPage] Accounts:', accounts.map(a => ({ name: a.name, balance: a.balance })));
    console.log('[AccountsPage] Total Balance:', total);
    return total;
  }, [accounts]);

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

  const handleCreateAccount = useCallback(
    async (data: { name: string; balance?: number; is_default?: boolean }) => {
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
    },
    [haptic, WebApp, t]
  );

  const handleUpdateAccount = useCallback(
    async (accountId: string, data: { name?: string; is_default?: boolean }) => {
      try {
        const updatedAccount = await apiClient.updateAccount(accountId, data);
        setAccounts((prev) => prev.map((a) => (a.id === accountId ? updatedAccount : a)));
        haptic?.notificationOccurred?.('success');
        WebApp.showAlert?.(t('accounts.updateSuccess'));
      } catch (error) {
        console.error('Failed to update account:', error);
        haptic?.notificationOccurred?.('error');
        WebApp.showAlert?.(t('errors.saveFailed'));
        throw error;
      }
    },
    [haptic, WebApp, t]
  );

  const handleAccountTap = useCallback(
    (account: Account) => {
      haptic?.selectionChanged?.();
      setSelectedAccount(account);
    },
    [haptic]
  );

  const handleAddAccountTap = useCallback(() => {
    haptic?.selectionChanged?.();
    setCreateSheetOpen(true);
  }, [haptic]);

  // Loading skeleton (closer to final layout)
  if (!isReady || loadingInit) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="h-safe-top" />
          <div className="px-4 py-3 max-w-lg mx-auto">
            <Skeleton className="h-7 w-32" />
          </div>
        </header>

        <main className="px-4 pb-10 max-w-lg mx-auto">
          <div className="pt-6">
            <Skeleton className="h-4 w-28 mx-auto mb-3" />
            <Skeleton className="h-14 w-[min(420px,100%)] mx-auto rounded-2xl" />
          </div>

          <div className="mt-8">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>

          <div className="h-safe-bottom" />
        </main>
      </div>
    );
  }

  const isEmpty = accounts.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header that owns safe-area */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="h-safe-top" />
        <div className="px-4 py-3 max-w-lg mx-auto">
          <h1 className="text-xl font-semibold tracking-tight text-center">
            {t('accounts.title')}
          </h1>
        </div>
      </header>

      <main className="px-4 pb-10 max-w-lg mx-auto">
        {/* Hero */}
        <section className="pt-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">
            {t('accounts.totalBalance')}
          </p>

          <div className="mt-2 flex justify-center">
            <AnimatedBalance
              value={totalBalance}
              currencyCode={currencyCode}
              locale={locale}
              className="w-full"
            />
          </div>

          {/* Optional subtle meta */}
          <p className="mt-2 text-xs text-muted-foreground text-center">
            {t('accounts.accountsCount', { count: accounts.length })}
          </p>
        </section>

        {/* Accounts section */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('common.accounts')}
            </h2>
          </div>

          {isEmpty ? (
            <div className="rounded-3xl border border-border/40 bg-card/30 p-6 text-center">
              <p className="text-base font-semibold text-foreground">
                {t('accounts.emptyTitle')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('accounts.emptySubtitle')}
              </p>

              <div className="mt-5 flex justify-center">
                <Button onClick={handleAddAccountTap} className="rounded-2xl">
                  {t('accounts.create')}
                </Button>
              </div>
            </div>
          ) : (
            <AccountListCard
              accounts={accounts}
              totalBalance={totalBalance}
              currencyCode={currencyCode}
              locale={locale}
              onAccountTap={handleAccountTap}
              onAddAccountTap={handleAddAccountTap}
            />
          )}
        </section>

        <div className="h-safe-bottom" />
      </main>

      {/* Sheets */}
      <CreateAccountSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        onCreate={handleCreateAccount}
      />

      <AccountActionsSheet
        account={selectedAccount}
        currencyCode={currencyCode}
        locale={locale}
        onClose={() => setSelectedAccount(null)}
        onSave={handleUpdateAccount}
      />
    </div>
  );
}
