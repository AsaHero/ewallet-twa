import { DollarSign, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useFormContext, Controller } from 'react-hook-form';
import type { ParsedTransaction } from '@/core/types';
import { useTranslation } from 'react-i18next';
import { useMoneySync } from '@/hooks/useMoneySync';
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function AmountInput() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const form = useFormContext<ParsedTransaction>();
  const { control, watch, setValue, formState, getValues } = form;

  const [fxOpen, setFxOpen] = useState(false);

  const originalAmount = watch("original_amount");
  const fxRate = watch("fx_rate");

  // Cleaned unused vars
  // const amount = watch("amount");
  // const txType = watch("type");
  // const accountId = watch("account_id");

  const { markEdited } = useMoneySync({ watch, setValue });

  const shouldShowFx = useMemo(() => {
    return !!(fxRate || originalAmount);
  }, [fxRate, originalAmount]);

  // We need to fetch account balance to show preview
  // But accounts are in parent.
  // Maybe we should pass "selectedAccount" as prop?
  // Or just don't show balance preview here?
  // The original redesign had it.
  // Let's pass the balance delta at least, or lift the state.
  // For now, I will omit the balance preview in this component to keep it clean,
  // OR I can use a hook/context to get accounts.
  // Ideally, this component handles INPUT. The preview could be outside or passed in.
  // Let's keep it simple: Just inputs.

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">
          <DollarSign className="inline w-3 h-3 mr-1" />
          {t('transaction.amount') || 'Amount'} ({user?.currency_code})
        </label>

        <Controller
          control={control}
          name="amount"
          rules={{ min: 0.01 }}
          render={({ field }) => (
            <input
              type="number"
              step="0.01"
              value={field.value ?? ''}
              onChange={(e) => {
                markEdited("amount");
                field.onChange(parseFloat(e.target.value) || 0);
              }}
              placeholder="0.00"
              className={cn(
                "w-full px-4 py-3 bg-background rounded-xl border-2 transition-colors",
                "text-2xl font-bold tabular-nums",
                "focus:outline-none focus:border-primary",
                (formState.errors.amount ? "border-red-500" : "border-transparent")
              )}
            />
          )}
        />

        {formState.errors.amount ? (
          <p className="text-xs text-red-500">{t('errors.invalidAmount') || 'Amount must be greater than 0'}</p>
        ) : null}

        <Collapsible open={fxOpen || shouldShowFx} onOpenChange={setFxOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="px-2">
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                {t('transaction.exchangeDetails') || 'Exchange details'}
              </Button>
            </CollapsibleTrigger>
            <div className="text-xs text-muted-foreground">
              {fxRate ? `FX: ${fxRate}` : ''}
            </div>
          </div>

          <CollapsibleContent className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  {t('transaction.originalAmount') || 'Original amount'}
                </label>
                <Controller
                  control={control}
                  name="original_amount"
                  render={({ field }) => (
                    <input
                      type="number"
                      step="0.01"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        markEdited("original_amount");
                        field.onChange(parseFloat(e.target.value) || 0);
                      }}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent focus:outline-none focus:border-primary"
                    />
                  )}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t('transaction.receipt') || 'Receipt'} {getValues("original_currency") ? `(${getValues("original_currency")})` : ''}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  {t('transaction.fxRate') || 'FX rate'}
                </label>
                <Controller
                  control={control}
                  name="fx_rate"
                  render={({ field }) => (
                    <input
                      type="number"
                      step="0.0001"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        markEdited("fx_rate");
                        const v = parseFloat(e.target.value);
                        field.onChange(Number.isFinite(v) ? v : undefined);
                      }}
                      placeholder="e.g. 1.12"
                      className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent focus:outline-none focus:border-primary"
                    />
                  )}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t('transaction.userCurrency') || 'User currency'}: {user?.currency_code}
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {fxRate && originalAmount
                ? `${t('transaction.convertedPreview') || 'Converted'} ≈ ${round2(originalAmount * fxRate)} ${user?.currency_code}`
                : (t('transaction.fxHint') || 'Tip: set FX rate to auto-update amounts')}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
