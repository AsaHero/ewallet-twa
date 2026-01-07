import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { getDebtUrgency, getUrgencyStyles, formatDueDate } from '@/lib/debtHelpers';
import type { Debt } from '@/core/types';

interface DebtCardProps {
  debt: Debt;
  onClick: () => void;
  locale?: string;
}

function hapticSelect() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any)?.Telegram?.WebApp;
  try {
    tg?.HapticFeedback?.selectionChanged?.();
  } catch {
    // ignore
  }
}

export function DebtCard({ debt, onClick, locale }: DebtCardProps) {
  const { t } = useTranslation();
  const urgency = getDebtUrgency(debt);
  const urgencyStyles = getUrgencyStyles(urgency);
  const dueDateText = formatDueDate(debt.due_at, t);

  const handleClick = () => {
    hapticSelect();
    onClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14 }}
    >
      <Card
        className={cn(
          'border hover:bg-card/70 transition-colors cursor-pointer active:scale-[0.997]',
          urgencyStyles
        )}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Person name */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base text-foreground truncate">
                👤 {debt.name}
              </p>
            </div>

            {/* Amount */}
            <p className="font-bold tabular-nums text-base flex-shrink-0 text-foreground">
              {formatCurrency(debt.amount, debt.currency_code, locale)}
            </p>
          </div>

          {/* Due date */}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">
              📅 {dueDateText}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
