import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { useAuth } from '../contexts/AuthContext';
import type { Account, Category } from '../core/types';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Calendar, DollarSign, Tag, Wallet, FileText, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TransactionFormData {
  type: 'withdrawal' | 'deposit';
  amount: number;
  currency_code?: string;
  category_id?: number;
  subcategory_id?: number;
  account_id: string;
  note?: string;
  performed_at?: string;
}

function TransactionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { WebApp, isReady } = useTelegramWebApp();
  const { user, loading: authLoading } = useAuth();

  // Determine mode and get data
  const transactionId = searchParams.get('id');
  const dataParam = searchParams.get('data');
  const mode = transactionId ? 'edit' : 'create';

  // State
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'withdrawal',
    amount: 0,
    account_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    if (!isReady || authLoading || !user) return;

    const loadData = async () => {
      try {
        // Load accounts and categories in parallel
        const [accountsData, categoriesData] = await Promise.all([
          apiClient.getAccounts(),
          apiClient.getCategories(),
        ]);

        setAccounts(accountsData);
        setCategories(categoriesData);

        // Load transaction data based on mode
        if (mode === 'edit' && transactionId) {
          // Edit existing transaction
          const transaction = await apiClient.getTransaction(transactionId);
          setFormData({
            type: transaction.type,
            amount: transaction.amount,
            currency_code: transaction.currency_code,
            category_id: transaction.category_id,
            subcategory_id: transaction.subcategory_id,
            account_id: transaction.account_id,
            note: transaction.note,
            performed_at: transaction.performed_at || transaction.created_at,
          });
        } else if (mode === 'create' && dataParam) {
          // Create with parsed data
          const parsedData = JSON.parse(decodeURIComponent(dataParam));
          setFormData({
            type: parsedData.type || 'withdrawal',
            amount: parsedData.amount || 0,
            currency_code: parsedData.currency,
            category_id: parsedData.category_id,
            account_id: parsedData.account_id || accountsData.find(a => a.is_default)?.id || accountsData[0]?.id,
            note: parsedData.note,
            performed_at: parsedData.performed_at,
          });
        } else {
          // New transaction - set default account
          const defaultAccount = accountsData.find(a => a.is_default) || accountsData[0];
          setFormData(prev => ({ ...prev, account_id: defaultAccount?.id || '' }));
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        WebApp.showAlert('Failed to load transaction data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isReady, authLoading, user, mode, transactionId, dataParam]);

  // Setup Telegram MainButton
  useEffect(() => {
    if (!isReady) return;

    const buttonText = mode === 'edit' ? t('common.save') || 'Save Changes' : t('common.create') || 'Create Transaction';
    WebApp.MainButton.setText(buttonText);
    WebApp.MainButton.show();
    WebApp.MainButton.enable();

    const handleSave = () => {
      submitForm();
    };

    WebApp.MainButton.onClick(handleSave);

    return () => {
      WebApp.MainButton.hide();
      WebApp.MainButton.offClick(handleSave);
    };
  }, [isReady, mode, formData]);

  // Setup BackButton
  useEffect(() => {
    if (!isReady) return;

    WebApp.BackButton.show();
    const handleBack = () => {
      if (mode === 'create') {
        WebApp.close();
      } else {
        navigate('/');
      }
    };

    WebApp.BackButton.onClick(handleBack);

    return () => {
      WebApp.BackButton.hide();
      WebApp.BackButton.offClick(handleBack);
    };
  }, [isReady, mode, navigate]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('errors.invalidAmount') || 'Amount must be greater than 0';
    }
    if (!formData.account_id) {
      newErrors.account_id = t('errors.selectAccount') || 'Please select an account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const submitForm = async () => {
    if (!validateForm()) {
      WebApp.HapticFeedback.notificationOccurred('error');
      return;
    }

    WebApp.MainButton.showProgress();

    try {
      if (mode === 'edit' && transactionId) {
        // Update existing transaction
        await apiClient.updateTransaction(transactionId, formData);
        WebApp.HapticFeedback.notificationOccurred('success');
        WebApp.showAlert(t('transaction.updated') || 'Transaction updated!', () => {
          WebApp.close();
        });
      } else {
        // Create new transaction
        await apiClient.createTransaction(formData);
        WebApp.HapticFeedback.notificationOccurred('success');
        WebApp.showAlert(t('transaction.created') || 'Transaction created!', () => {
          WebApp.close();
        });
      }
    } catch (err) {
      console.error('Failed to save transaction:', err);
      WebApp.HapticFeedback.notificationOccurred('error');
      WebApp.showAlert(t('errors.saveFailed') || 'Failed to save transaction');
    } finally {
      WebApp.MainButton.hideProgress();
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (!transactionId) return;

    WebApp.showConfirm(
      t('transaction.confirmDelete') || 'Delete this transaction? This cannot be undone.',
      async (confirmed) => {
        if (confirmed) {
          try {
            await apiClient.deleteTransaction(transactionId);
            WebApp.HapticFeedback.notificationOccurred('success');
            WebApp.showAlert(t('transaction.deleted') || 'Transaction deleted', () => {
              WebApp.close();
            });
          } catch (err) {
            console.error('Failed to delete transaction:', err);
            WebApp.HapticFeedback.notificationOccurred('error');
            WebApp.showAlert(t('errors.deleteFailed') || 'Failed to delete transaction');
          }
        }
      }
    );
  };

  // Update form field
  const updateField = <K extends keyof TransactionFormData>(field: K, value: TransactionFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-lg border-b border-border/40 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'edit' ? t('transaction.edit') || 'Edit Transaction' : t('transaction.new') || 'New Transaction'}
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Type Toggle */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
              {t('transaction.type') || 'Type'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateField('type', 'withdrawal')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-medium transition-all",
                  formData.type === 'withdrawal'
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                    : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                )}
              >
                📤 {t('transaction.expense') || 'Expense'}
              </button>
              <button
                type="button"
                onClick={() => updateField('type', 'deposit')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-medium transition-all",
                  formData.type === 'deposit'
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                    : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                )}
              >
                📥 {t('transaction.income') || 'Income'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Amount */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
              <DollarSign className="inline w-3 h-3 mr-1" />
              {t('transaction.amount') || 'Amount'}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={cn(
                "w-full px-4 py-3 bg-background rounded-xl border-2 transition-colors",
                "text-2xl font-bold tabular-nums",
                "focus:outline-none focus:border-primary",
                errors.amount ? "border-red-500" : "border-transparent"
              )}
            />
            {errors.amount && (
              <p className="text-xs text-red-500 mt-2">{errors.amount}</p>
            )}
          </CardContent>
        </Card>

        {/* Category */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
              <Tag className="inline w-3 h-3 mr-1" />
              {t('transaction.category') || 'Category'}
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => updateField('category_id', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent
                         focus:outline-none focus:border-primary appearance-none cursor-pointer"
            >
              <option value="">{t('transaction.selectCategory') || 'Select category...'}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
              <Wallet className="inline w-3 h-3 mr-1" />
              {t('transaction.account') || 'Account'}
            </label>
            <select
              value={formData.account_id}
              onChange={(e) => updateField('account_id', e.target.value)}
              className={cn(
                "w-full px-4 py-3 bg-background rounded-xl border-2 transition-colors",
                "focus:outline-none focus:border-primary appearance-none cursor-pointer",
                errors.account_id ? "border-red-500" : "border-transparent"
              )}
            >
              <option value="">{t('transaction.selectAccount') || 'Select account...'}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.is_default ? '⭐ ' : ''}{acc.name}
                </option>
              ))}
            </select>
            {errors.account_id && (
              <p className="text-xs text-red-500 mt-2">{errors.account_id}</p>
            )}
          </CardContent>
        </Card>

        {/* Note */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
              <FileText className="inline w-3 h-3 mr-1" />
              {t('transaction.note') || 'Note'} ({t('common.optional') || 'optional'})
            </label>
            <textarea
              value={formData.note || ''}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder={t('transaction.notePlaceholder') || 'Add a note...'}
              rows={3}
              className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent
                         focus:outline-none focus:border-primary resize-none"
            />
          </CardContent>
        </Card>

        {/* Date */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
              <Calendar className="inline w-3 h-3 mr-1" />
              {t('transaction.date') || 'Date'}
            </label>
            <input
              type="datetime-local"
              value={formData.performed_at ? new Date(formData.performed_at).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateField('performed_at', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent
                         focus:outline-none focus:border-primary"
            />
          </CardContent>
        </Card>

        {/* Delete Button (only in edit mode) */}
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-4 flex items-center justify-center gap-2
                       text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('transaction.delete') || 'Delete Transaction'}
          </button>
        )}
      </div>
    </div>
  );
}

export default TransactionPage;
