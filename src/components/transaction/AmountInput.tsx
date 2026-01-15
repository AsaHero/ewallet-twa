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

  const originalAmount = watch('original_amount');
  const fxRate = watch('fx_rate');

  const { markEdited } = useMoneySync({ watch, setValue });

  const shouldShowFx = useMemo(() => !!(fxRate || originalAmount), [fxRate, originalAmount]);

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">
          <DollarSign className="inline w-3 h-3 mr-1" />
          {t('transaction.amount')} ({user?.currency_code})
        </label>

        <Controller
          control={control}
          name="amount"
          // ✅ allow empty while editing, validate when present
          rules={{
            validate: (v) => v === undefined || v >= 0.01,
          }}
          render={({ field }) => (
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={field.value ?? ''}
              onChange={(e) => {
                markEdited('amount');
                const raw = e.target.value;

                // ✅ let user clear the field completely
                if (raw === '') {
                  field.onChange(undefined);
                  return;
                }

                const num = Number(raw);
                field.onChange(Number.isFinite(num) ? num : undefined);
              }}
              placeholder="0.00"
              className={cn(
                'w-full px-4 py-3 bg-background rounded-xl border-2 transition-colors',
                'text-2xl font-bold tabular-nums',
                'focus:outline-none focus:border-primary',
                formState.errors.amount ? 'border-red-500' : 'border-transparent'
              )}
            />
          )}
        />

        {formState.errors.amount ? <p className="text-xs text-red-500">{t('errors.invalidAmount')}</p> : null}

        <Collapsible open={fxOpen || shouldShowFx} onOpenChange={setFxOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="px-2">
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                {t('transaction.exchangeDetails')}
              </Button>
            </CollapsibleTrigger>
            <div className="text-xs text-muted-foreground">{fxRate ? `FX: ${fxRate}` : ''}</div>
          </div>

          <CollapsibleContent className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  {t('transaction.originalAmount')}
                </label>

                <Controller
                  control={control}
                  name="original_amount"
                  render={({ field }) => (
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        markEdited('original_amount');
                        const raw = e.target.value;

                        if (raw === '') {
                          field.onChange(undefined);
                          return;
                        }

                        const num = Number(raw);
                        field.onChange(Number.isFinite(num) ? num : undefined);
                      }}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent focus:outline-none focus:border-primary"
                    />
                  )}
                />

                <p className="text-[11px] text-muted-foreground mt-1">
                  {t('transaction.receipt')} {getValues('original_currency') ? `(${getValues('original_currency')})` : ''}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  {t('transaction.fxRate')}
                </label>

                <Controller
                  control={control}
                  name="fx_rate"
                  render={({ field }) => (
                    <input
                      type="number"
                      step="0.0001"
                      inputMode="decimal"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        markEdited('fx_rate');
                        const raw = e.target.value;

                        if (raw === '') {
                          field.onChange(undefined);
                          return;
                        }

                        const num = Number(raw);
                        field.onChange(Number.isFinite(num) ? num : undefined);
                      }}
                      placeholder="e.g. 1.12"
                      className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent focus:outline-none focus:border-primary"
                    />
                  )}
                />

                <p className="text-[11px] text-muted-foreground mt-1">
                  {t('transaction.userCurrency')}: {user?.currency_code}
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {fxRate && originalAmount ? `${t('transaction.convertedPreview')} ≈ ${round2(originalAmount * fxRate)} ${user?.currency_code}` : t('transaction.fxHint')}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
