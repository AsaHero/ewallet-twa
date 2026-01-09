import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

import { apiClient } from '@/api/client';
import type { User, Debt } from '@/core/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { useAuth } from '@/contexts/AuthContext';
import { sortDebtsByUrgency } from '@/lib/debtHelpers';

import { DebtTabs } from '@/components/debts/DebtTabs';
import { DebtCard } from '@/components/debts/DebtCard';
import { DebtDetailModal } from '@/components/debts/DebtDetailModal';

function DebtsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady } = useTelegramWebApp();
  const { loading: authLoading } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'borrow' | 'lend'>('borrow');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  useEffect(() => {
    if (!isReady || authLoading) return;

    const fetchBootstrap = async () => {
      try {
        setLoadingBootstrap(true);
        const [userData, debtsData] = await Promise.all([
          apiClient.getMe(),
          apiClient.getDebts({ statuses: ['open'] }), // Only fetch open debts
        ]);

        setUser(userData);
        setDebts(debtsData.items || []);
      } catch (err) {
        console.error('Failed to fetch debts bootstrap:', err);
        setError(err instanceof Error ? err.message : 'Failed to load debts');
      } finally {
        setLoadingBootstrap(false);
      }
    };

    fetchBootstrap();
  }, [isReady, authLoading]);

  // TWA BackButton - not used on debts page as it's a standalone page
  // But keeping navigate imported in case we add navigation later
  useEffect(() => {
    // Could add back button logic here if needed
    console.log('Debts page mounted', navigate);
  }, [navigate]);

  // Filter debts by active tab
  const filteredDebts = useMemo(() => {
    if (!debts || !Array.isArray(debts)) return [];
    const filtered = debts.filter((debt) => debt.type === activeTab);
    return sortDebtsByUrgency(filtered);
  }, [debts, activeTab]);

  // Count debts by type (for tab badges)
  const borrowCount = useMemo(
    () => (debts || []).filter((d) => d.type === 'borrow').length,
    [debts]
  );
  const lendCount = useMemo(
    () => (debts || []).filter((d) => d.type === 'lend').length,
    [debts]
  );

  const refetchDebts = async () => {
    try {
      const debtsData = await apiClient.getDebts({ statuses: ['open'] });
      setDebts(debtsData.items || []);
    } catch (err) {
      console.error('Failed to refetch debts:', err);
    }
  };

  if (loadingBootstrap) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-safe-top" />
        <div className="px-4 pt-3 pb-8 max-w-md mx-auto">
          <Skeleton className="h-9 w-28 mb-4" />
          <Skeleton className="h-12 w-full rounded-2xl mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="h-safe-bottom" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">{t('common.error')}</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const showEmpty = filteredDebts.length === 0;

  return (
    <motion.div
      className="min-h-screen bg-background text-foreground"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="px-4 pb-8 max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-md -mx-4 px-4 border-b border-border/40">
          <div className="h-safe-top" />
          <div className="pt-3 pb-3">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{t('debts.title')}</h1>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-4">
          <DebtTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            borrowCount={borrowCount}
            lendCount={lendCount}
          />
        </div>

        {/* Debt List */}
        <div className="mt-4">
          {showEmpty ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">💰</div>
              <p className="text-muted-foreground">
                {activeTab === 'borrow'
                  ? t('debts.noBorrows')
                  : t('debts.noLends')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDebts.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onClick={() => setSelectedDebt(debt)}
                  locale={user?.language_code}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Debt Detail Modal */}
      <DebtDetailModal
        debt={selectedDebt}
        onClose={() => setSelectedDebt(null)}
        onDebtUpdated={refetchDebts}
        locale={user?.language_code}
        timezone={user?.timezone}
      />

      <div className="h-safe-bottom" />
    </motion.div>
  );
}

export default DebtsPage;
