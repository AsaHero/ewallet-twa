import { useEffect, useMemo, useState, useCallback } from 'react';
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
import { Tag, Wallet, FileText } from 'lucide-react';
import { cn } from '../lib/utils'; // Keep for some inline usage or check if needed

import { FieldRow } from '../components/transaction/FieldRow';
import { PickerDialog, type PickerItem } from '../components/transaction/PickerDialog';
import { TypeSelector } from '../components/transaction/TypeSelector';
import { AmountInput } from '../components/transaction/AmountInput';
import { DateTimeInput } from '../components/transaction/DateTimeInput';
// import { useMoneySync } from '../hooks/useMoneySync'; // Not need directly here
// No, AmountInput uses it internally now. But TransactionPage needs to know about updates?
// Actually AmountInput handles the sync logic locally for the form.

// Wait, TypeSelector and AmountInput are nice, but what about Category/Account/Note?
// I will keep them in the page or Refactor further?
// Plan said "Cleanup Redesign.tsx". I should use the new components structure.
// I can keep Account/Note/Category logic in the Page for now to avoid over-abstracting the data fetching part.

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

  // picker state
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [subPickerOpen, setSubPickerOpen] = useState(false);

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
  // const accountId = watch("account_id"); // Used for display logic if needed

  // Memoized data helpers
  const subcatsByCatId = useMemo(() => {
    const map = new Map<number, Subcategory[]>();
    for (const s of subcategories) {
      const arr = map.get(s.category_id) ?? [];
      arr.push(s);
      map.set(s.category_id, arr);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999) || a.name.localeCompare(b.name));
      map.set(k, arr);
    }
    return map;
  }, [subcategories]);

  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const subcatById = useMemo(() => new Map(subcategories.map(s => [s.id, s])), [subcategories]);

  const categoryItems: PickerItem[] = useMemo(
    () => categories.map(c => ({
      id: c.id,
      label: `${c.emoji ?? ""} ${c.name}`.trim(),
    })),
    [categories]
  );

  const subcategoryItems: PickerItem[] = useMemo(() => {
    if (!categoryId) return [];
    const subcats = subcatsByCatId.get(categoryId) ?? [];
    return subcats.map(s => ({
      id: s.id,
      label: `${s.emoji ?? ""} ${s.name}`.trim(),
    }));
  }, [categoryId, subcatsByCatId]);

  const selectedCategoryLabel = useMemo(() => {
    if (!categoryId) return "";
    const c = catById.get(categoryId);
    return c ? `${c.emoji ?? ""} ${c.name}`.trim() : "";
  }, [categoryId, catById]);

  const selectedSubcategoryLabel = useMemo(() => {
    if (!subcategoryId) return "";
    const s = subcatById.get(subcategoryId);
    return s ? `${s.emoji ?? ""} ${s.name}`.trim() : "";
  }, [subcategoryId, subcatById]);

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

  // Pickers Callbacks
  const onPickCategory = useCallback((catId: number) => {
    setValue("category_id", catId, { shouldDirty: true });
    // clear sub if not valid
    const currentSubId = getValues("subcategory_id");
    if (currentSubId) {
      const allowed = (subcatsByCatId.get(catId) ?? []).some(s => s.id === currentSubId);
      if (!allowed) setValue("subcategory_id", undefined, { shouldDirty: true });
    }
    // open sub picker if needed
    const subcats = subcatsByCatId.get(catId) ?? [];
    if (subcats.length > 0) {
      setSubPickerOpen(true);
    }
  }, [getValues, setValue, subcatsByCatId]);

  const onPickSubcategory = useCallback((subId: number) => {
    setValue("subcategory_id", subId, { shouldDirty: true });
  }, [setValue]);


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

          {/* Category */}
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 space-y-4">
              <FieldRow
                label={t('transaction.category') || 'Category'}
                icon={<Tag className="inline w-3 h-3 mr-1" />}
                value={selectedCategoryLabel}
                placeholder={t('transaction.selectCategory') || 'Select category...'}
                onClick={() => setCatPickerOpen(true)}
              />

              <FieldRow
                label={t('transaction.subcategory') || 'Subcategory'}
                icon={<Tag className="inline w-3 h-3 mr-1" />}
                value={selectedSubcategoryLabel}
                placeholder={
                  categoryId
                    ? (subcategoryItems.length > 0 ? (t('transaction.selectSubcategory') || 'Select subcategory...') : (t('transaction.noSubcategories') || 'No subcategories'))
                    : (t('transaction.selectCategoryFirst') || 'Select category first')
                }
                onClick={() => {
                  if (!categoryId) setCatPickerOpen(true);
                  else if (subcategoryItems.length > 0) setSubPickerOpen(true);
                }}
              />
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

        {/* Pickers */}
        <PickerDialog
          open={catPickerOpen}
          onOpenChange={setCatPickerOpen}
          title={t('transaction.selectCategory') || 'Select category'}
          items={categoryItems}
          value={categoryId}
          onPick={onPickCategory}
        />

        <PickerDialog
          open={subPickerOpen}
          onOpenChange={setSubPickerOpen}
          title={t('transaction.selectSubcategory') || 'Select subcategory'}
          items={subcategoryItems}
          value={subcategoryId}
          onPick={onPickSubcategory}
        />
      </div>
    </FormProvider>
  );
}

export default TransactionPage;
