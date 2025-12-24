import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';
import type { ParsedTransaction } from '@/core/types';
import { useTranslation } from 'react-i18next';

export function TypeSelector() {
  const { t } = useTranslation();
  const { setValue, watch } = useFormContext<ParsedTransaction>();
  const txType = watch('type');

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
          {t('transaction.type')}
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => setValue('type', 'withdrawal', { shouldDirty: true })}
            className={cn(
              "flex-1 py-6 rounded-xl font-medium transition-all",
              txType === 'withdrawal'
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-500"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
            )}
          >
            📤 {t('transaction.expense')}
          </Button>
          <Button
            type="button"
            onClick={() => setValue('type', 'deposit', { shouldDirty: true })}
            className={cn(
              "flex-1 py-6 rounded-xl font-medium transition-all",
              txType === 'deposit'
                ? "bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-500"
                : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
            )}
          >
            📥 {t('transaction.income')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
