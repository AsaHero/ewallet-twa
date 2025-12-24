import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from './api/client';
import { authService } from './services/auth.service';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import type { Account, User, Transaction } from './core/types';
import { Card, CardContent } from './components/ui/card';
import { Skeleton } from './components/ui/skeleton';
import { Wallet, ChevronDown, ArrowRight } from 'lucide-react';
import { formatCurrency } from './lib/formatters';
import { cn } from './lib/utils';
import HistoryPage from './pages/HistoryPage';
import TransactionPage from './pages/TransactionPage';

function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user: tgUser, isReady, initData } = useTelegramWebApp();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    const init = async () => {
      try {
        // 1. Check for token in URL (bot-provided)
        let token = authService.getTokenFromURL();

        // 2. If no token, authenticate with initData or user ID
        if (!token) {
          token = authService.getToken();

          if (!token && initData) {
            // Try initData authentication
            try {
              await authService.authenticateWithInitData(initData);
            } catch (err) {
              // Fallback to user ID authentication
              if (tgUser) {
                await authService.authenticateWithUserId(tgUser.id, {
                  first_name: tgUser.first_name,
                  last_name: tgUser.last_name,
                  username: tgUser.username,
                  language_code: tgUser.language_code,
                });
              } else {
                throw new Error('No Telegram user data available');
              }
            }
          }
        }

        // 3. Fetch user, accounts, and recent transactions
        const [userData, accountsData, transactionsResponse] = await Promise.all([
          apiClient.getMe(),
          apiClient.getAccounts(),
          apiClient.getTransactions({ limit: 5 }) // Get last 5 transactions
        ]);

        setUser(userData);
        setAccounts(accountsData);
        setRecentTransactions(transactionsResponse.items);

        // 4. Set language from user settings
        if (userData.language_code) {
          // Map language codes (e.g., 'en-US' -> 'en')
          const langCode = userData.language_code.split('-')[0].toLowerCase();
          if (['en', 'ru', 'uz'].includes(langCode)) {
            i18n.changeLanguage(langCode);
          }
        } else if (tgUser?.language_code) {
          // Fallback to Telegram language
          const langCode = tgUser.language_code.split('-')[0].toLowerCase();
          if (['en', 'ru', 'uz'].includes(langCode)) {
            i18n.changeLanguage(langCode);
          }
        }

        // 5. Calculate total balance
        const total = accountsData.reduce((sum, acc) => sum + acc.balance, 0);
        setTotalBalance(total);

      } catch (err) {
        console.error('Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isReady, initData, tgUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">{t('common.error')}</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const displayedAccounts = isAccountsExpanded ? accounts : accounts.slice(0, 2);
  const hasMoreAccounts = accounts.length > 2;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Safe area spacer for notch/status bar */}
      <div className="h-safe-top" />

      {/* Additional padding to avoid close button */}
      <div className="h-14" />

      <div className="px-4 pb-8 max-w-md mx-auto">
        {/* Header */}
        <header className="pt-2 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tgUser?.photo_url ? (
              <img
                src={tgUser.photo_url}
                alt={tgUser.first_name}
                className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={cn(
                "w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10",
                "flex items-center justify-center text-primary font-bold text-lg border border-primary/20",
                tgUser?.photo_url && "hidden"
              )}
            >
              {tgUser?.first_name?.[0] || user?.tg_user_id.toString()[0] || 'W'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium">{t('common.welcomeBack')}</span>
              <span className="font-semibold text-base text-foreground">
                {tgUser?.first_name || 'User'}
              </span>
            </div>
          </div>
          <Wallet className="w-6 h-6 text-primary" />
        </header>

        {/* Total Balance Card */}
        <div className="mb-8">
          <div className="glass-card rounded-3xl p-8 text-center relative overflow-hidden">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

            <div className="relative z-10">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {t('common.totalBalance')}
              </p>
              <h1 className={cn(
                "font-bold text-foreground mb-1 tracking-tight",
                totalBalance >= 1000000 ? "text-3xl" : totalBalance >= 100000 ? "text-4xl" : "text-5xl"
              )}>
                {formatCurrency(
                  totalBalance,
                  user?.currency_code || 'USD',
                  user?.language_code
                )}
              </h1>
            </div>
          </div>
        </div>

        {/* Accounts Section */}
        <div className="space-y-4 mb-8">
          <div
            className="flex items-center justify-between px-1 cursor-pointer group"
            onClick={() => hasMoreAccounts && setIsAccountsExpanded(!isAccountsExpanded)}
          >
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              {t('common.accounts')}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('common.account', { count: accounts.length })}
              </span>
              {hasMoreAccounts && (
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-300",
                    "group-hover:text-foreground",
                    isAccountsExpanded && "rotate-180"
                  )}
                />
              )}
            </div>
          </div>

          <div className="space-y-3">
            {displayedAccounts.map((account) => (
              <Card
                key={account.id}
                className="border-0 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 cursor-pointer group"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center transition-all",
                        "bg-gradient-to-br from-primary/15 to-primary/5",
                        "group-hover:from-primary/20 group-hover:to-primary/10",
                        "border border-primary/10"
                      )}>
                        <div className="w-6 h-6 rounded-lg bg-primary/20" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-base text-foreground">
                          {account.name}
                        </p>
                        {account.is_default && (
                          <p className="text-xs text-muted-foreground">{t('common.default')}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-foreground tabular-nums",
                        account.balance >= 1000000 ? "text-sm" : account.balance >= 100000 ? "text-base" : "text-lg"
                      )}>
                        {formatCurrency(
                          account.balance,
                          user?.currency_code || 'USD',
                          user?.language_code
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Transactions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              {t('common.recentTransactions')}
            </h2>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="relative">
              {/* Transactions List */}
              <div className="space-y-2">
                {recentTransactions.slice(0, 3).map((transaction) => (
                  <Card
                    key={transaction.id}
                    className="border-0 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            transaction.type === 'withdrawal'
                              ? "bg-red-500/10"
                              : "bg-green-500/10"
                          )}>
                            <div className="text-xl">
                              {transaction.type === 'withdrawal' ? '�' : '📥'}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-medium text-sm text-foreground">
                              {transaction.note || (transaction.type === 'withdrawal' ? 'Expense' : 'Income')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.performed_at || transaction.created_at).toLocaleDateString(
                                user?.language_code || 'en-US',
                                { month: 'short', day: 'numeric' }
                              )}
                            </p>
                          </div>
                        </div>
                        <p className={cn(
                          "font-bold tabular-nums",
                          transaction.type === 'withdrawal' ? "text-red-500" : "text-green-500"
                        )}>
                          {transaction.type === 'withdrawal' ? '-' : '+'}{formatCurrency(
                            transaction.amount,
                            user?.currency_code || 'USD',
                            user?.language_code
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Gradient Blur Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-background via-background/80 to-transparent backdrop-blur-[2px]" />

              {/* See Full History Button */}
              <div
                onClick={() => navigate('/history')}
                className="relative mt-4 flex items-center justify-center gap-2 py-3 cursor-pointer group"
              >
                <span className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                  See full history
                </span>
                <ArrowRight className="w-4 h-4 text-primary group-hover:text-primary/80 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ) : (
            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-3">💳</div>
                <p className="text-sm text-muted-foreground">{t('common.noTransactions')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Safe area spacer for home indicator */}
      <div className="h-safe-bottom" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/transaction" element={<TransactionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
