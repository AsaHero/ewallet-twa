import { useEffect, useCallback, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, FormProvider } from 'react-hook-form';

import { apiClient } from '../api/client';
import { botClient } from '../api/bot';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { useAuth } from '../contexts/AuthContext';

import type { Account, Category, ParsedTransaction, Subcategory } from '../core/types';

import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Wallet, FileText, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

import { TypeSelector } from '../components/transaction/TypeSelector';
import { AmountInput } from '../components/transaction/AmountInput';
import { DateTimeInput } from '../components/transaction/DateTimeInput';
import { SearchableSelect } from '../components/transaction/SearchableSelect';

function TransactionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { WebApp, isReady, user: tgUser } = useTelegramWebApp();
  const { user, loading: authLoading } = useAuth();

  const transactionId = searchParams.get('id');
  const dataParam = searchParams.get('data');
  const mode = transactionId ? 'edit' : 'create';

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const form = useForm<ParsedTransaction>({
    defaultValues: {
      type: 'withdrawal',
      amount: 0,
      currency: user?.currency_code || 'USD',
      confidence: 1,
      account_id: '',
    },
    mode: "onChange",
  });

  const { watch, setValue, getValues, handleSubmit, reset, formState, register } = form;

  const categoryId = watch("category_id");
  const subcategoryId = watch("subcategory_id");

  // Memoized Items
  const categoryItems = useMemo(() =>
    categories
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map(c => ({
        id: c.id,
        label: c.name,
        emoji: c.emoji
      })),
    [categories]
  );

  const allSubcategoryItems = useMemo(() =>
    subcategories
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map(s => ({
        id: s.id,
        label: s.name,
        emoji: s.emoji
      })),
    [subcategories]
  );

  const filteredSubcategoryItems = useMemo(() => {
    if (!categoryId) return [];
    return subcategories
      .filter(s => s.category_id === categoryId)
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map(s => ({
        id: s.id,
        label: s.name,
        emoji: s.emoji
      }));
  }, [subcategories, categoryId]);

  // Load initial data
  useEffect(() => {
    if (!isReady || authLoading || !user) return;

    const loadData = async () => {
      try {
        const [accountsData, categoriesData, subcategoriesData] = await Promise.all([
          apiClient.getAccounts(),
          apiClient.getCategories(),
          apiClient.getSubcategories(),
        ]);

        setAccounts(accountsData);
        setCategories(categoriesData);
        setSubcategories(subcategoriesData);

        const defaultAccount = accountsData.find(a => a.is_default) || accountsData[0];

        if (mode === 'edit' && transactionId) {
          const transaction = await apiClient.getTransaction(transactionId);
          reset({
            type: transaction.type,
            amount: transaction.amount,
            currency: user.currency_code || transaction.currency_code,
            category_id: transaction.category_id,
            subcategory_id: transaction.subcategory_id,
            account_id: transaction.account_id || defaultAccount?.id || '',
            note: transaction.note,
            performed_at: transaction.performed_at || transaction.created_at,
            confidence: 1,
            original_amount: transaction.original_amount,
            original_currency: transaction.original_currency_code,
            fx_rate: transaction.fx_rate,
          });
        } else if (mode === 'create' && dataParam) {
          const parsedData = JSON.parse(decodeURIComponent(dataParam));
          reset({
            type: parsedData.type || 'withdrawal',
            amount: parsedData.amount || 0,
            currency: user.currency_code || 'USD',
            category_id: parsedData.category_id,
            subcategory_id: parsedData.subcategory_id,
            account_id: parsedData.account_id || defaultAccount?.id || '',
            note: parsedData.note,
            performed_at: parsedData.performed_at,
            confidence: parsedData.confidence || 1,
            original_amount: parsedData.original_amount,
            original_currency: parsedData.original_currency,
            fx_rate: parsedData.fx_rate,
          });
        } else {
          reset((prev) => ({
            ...prev,
            account_id: defaultAccount?.id || '',
            currency: user.currency_code || 'USD',
          }));
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        WebApp.showAlert('Failed to load transaction data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isReady, authLoading, user, mode, transactionId, dataParam, reset, WebApp]);

  const validateBeforeSubmit = useCallback((data: ParsedTransaction) => {
    data.currency = user?.currency_code || data.currency || "USD";
    if (!data.amount || data.amount <= 0) {
      return { ok: false, msg: t('errors.invalidAmount') || 'Amount must be greater than 0' };
    }
    if (!data.account_id) {
      return { ok: false, msg: t('errors.selectAccount') || 'Please select an account' };
    }
    return { ok: true as const };
  }, [t, user]);

  const onSubmit = useCallback(async (data: ParsedTransaction) => {
    const v = validateBeforeSubmit(data);
    if (!v.ok) {
        WebApp.HapticFeedback.notificationOccurred('error');
        WebApp.showAlert(v.msg);
        return;
    }
    if (!tgUser) {
        WebApp.showAlert('No Telegram user data available');
        return;
    }

    WebApp.MainButton.showProgress();
    try {
        await botClient.updateTransaction({
            from: {
                id: tgUser.id,
                first_name: tgUser.first_name,
                last_name: tgUser.last_name || '',
                username: tgUser.username || '',
                language_code: tgUser.language_code || 'en',
            },
            data: {
                ...data,
                currency: user?.currency_code || data.currency,
            },
        });

        WebApp.HapticFeedback.notificationOccurred('success');
        WebApp.showAlert(t('transaction.updated') || 'Transaction updated! Check your bot.', () => {
            WebApp.close();
        });
    } catch (err) {
        console.error('Failed to send data:', err);
        WebApp.HapticFeedback.notificationOccurred('error');
        WebApp.showAlert(t('errors.saveFailed') || 'Failed to send data');
    } finally {
        WebApp.MainButton.hideProgress();
    }
  }, [WebApp, tgUser, user, t, validateBeforeSubmit]);

  // MainButton
  useEffect(() => {
    if (!isReady) return;
    const buttonText = t('common.done') || 'Done';
    WebApp.MainButton.setText(buttonText);
    WebApp.MainButton.show();

    // We can rely on formState.isValid, but manual check often safer with complex validation
    const canSubmit = (getValues("amount") ?? 0) > 0 && !!getValues("account_id");
    if (canSubmit) WebApp.MainButton.enable();
    else WebApp.MainButton.disable();

    const handler = () => {
        handleSubmit(onSubmit)();
    };
    WebApp.MainButton.onClick(handler);
    return () => {
        WebApp.MainButton.hide();
        WebApp.MainButton.offClick(handler);
    };
  }, [isReady, t, WebApp, handleSubmit, onSubmit, getValues, formState]); // re-run on form checks

  // BackButton
  useEffect(() => {
    if (!isReady) return;
    WebApp.BackButton.show();
    const handleBack = () => {
        if (mode === 'create') WebApp.close();
        else navigate('/');
    };
    WebApp.BackButton.onClick(handleBack);
    return () => {
        WebApp.BackButton.hide();
        WebApp.BackButton.offClick(handleBack);
    };
  }, [isReady, mode, navigate, WebApp]);



  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-lg border-b border-border/40 z-10">
          <div className="max-w-md mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">
              {mode === 'edit' ? (t('transaction.edit') || 'Edit Transaction') : (t('transaction.new') || 'New Transaction')}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t('transaction.currency') || 'Currency'}: <span className="font-medium">{user?.currency_code}</span>
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          <TypeSelector />
          <AmountInput />

          <SearchableSelect
            label={t('transaction.category') || 'Category'}
            placeholder={t('transaction.selectCategory') || 'Select category...'}
            icon={<Tag className="inline w-3 h-3 mr-1" />}
            items={categoryItems}
            value={categoryId}
            onSelect={(id) => {
               // Logic: Category Change -> Reset Subcategory
               const newCatId = typeof id === 'number' ? id : undefined;

               // Only reset if actually changed? Or always?
               // User said "Category: transport -> Food; Subcategory: taxi -> Reset (Null)"
               // So if we Pick a Category, we should probably reset subcategory to be safe
               // UNLESS the current subcategory belongs to new category (unlikely unless same name/id)
               setValue("category_id", newCatId, { shouldDirty: true });
               setValue("subcategory_id", undefined, { shouldDirty: true });
            }}
          />

          <SearchableSelect
            label={t('transaction.subcategory') || 'Subcategory'}
            placeholder={
               categoryId
               ? (filteredSubcategoryItems.length > 0 ? (t('transaction.selectSubcategory') || 'Select subcategory...') : (t('transaction.noSubcategories') || 'No subcategories'))
               : (t('transaction.allSubcategories') || 'All subcategories...')
            }
            icon={<Tag className="inline w-3 h-3 mr-1" />}
            items={categoryId ? filteredSubcategoryItems : allSubcategoryItems}
            value={subcategoryId}
            onSelect={(id) => {
               const newSubId = typeof id === 'number' ? id : undefined;
               setValue("subcategory_id", newSubId, { shouldDirty: true });

               // Logic: Subcategory Change -> Auto-set Category if needed
               if (newSubId) {
                  const sub = subcategories.find(s => s.id === newSubId);
                  if (sub) {
                      // If category is already set and matches parent, do nothing
                      // If category is Null or different, set it to parent
                      if (categoryId !== sub.category_id) {
                          setValue("category_id", sub.category_id, { shouldDirty: true });
                      }
                  }
               }
            }}
          />

          {/* Account */}
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
                <Wallet className="inline w-3 h-3 mr-1" />
                {t('transaction.account') || 'Account'}
              </label>

              <select
                {...register("account_id", { required: true })}
                className={cn(
                  "w-full px-4 py-3 bg-background rounded-xl border-2 transition-colors",
                  "focus:outline-none focus:border-primary appearance-none cursor-pointer",
                  formState.errors.account_id ? "border-red-500" : "border-transparent"
                )}
              >
                <option value="">{t('transaction.selectAccount') || 'Select account...'}</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.is_default ? '⭐ ' : ''}{acc.name}
                  </option>
                ))}
              </select>

              {formState.errors.account_id ? (
                <p className="text-xs text-red-500 mt-2">{t('errors.selectAccount') || 'Please select an account'}</p>
              ) : null}
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
                {...register("note")}
                placeholder={t('transaction.notePlaceholder') || 'Add a note...'}
                rows={3}
                className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent focus:outline-none focus:border-primary resize-none"
              />
            </CardContent>
          </Card>

          {/* Date */}
          <DateTimeInput />
        </div>
      </div>
    </FormProvider>
  );
}

export default TransactionPage;
