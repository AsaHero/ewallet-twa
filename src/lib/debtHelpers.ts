import { differenceInDays, isPast, isToday, isTomorrow } from 'date-fns';
import type { Debt } from '@/core/types';

export type DebtUrgency = 'overdue' | 'urgent' | 'soon' | 'normal' | 'none';

export function getDebtUrgency(debt: Debt): DebtUrgency {
  if (debt.status !== 'open') return 'none';
  if (!debt.due_at) return 'none';

  const dueDate = new Date(debt.due_at);
  const now = new Date();

  if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';

  const daysUntilDue = differenceInDays(dueDate, now);

  if (daysUntilDue < 3) return 'urgent';
  if (daysUntilDue < 7) return 'soon';

  return 'normal';
}

export function getUrgencyStyles(urgency: DebtUrgency): string {
  switch (urgency) {
    case 'overdue':
      return 'border-red-500/70 bg-red-500/10';
    case 'urgent':
      return 'border-orange-500/60 bg-orange-500/10';
    case 'soon':
      return 'border-yellow-500/50 bg-yellow-500/5';
    case 'normal':
    case 'none':
    default:
      return 'border-border/40 bg-card/40';
  }
}

export function formatDueDate(
  dueDate: string | undefined,
  t: (key: string, options?: any) => string
): string {
  if (!dueDate) return t('debts.noDueDate');

  const date = new Date(dueDate);
  const now = new Date();

  if (isToday(date)) return t('debts.dueToday');
  if (isTomorrow(date)) return t('debts.dueTomorrow');

  const days = differenceInDays(date, now);

  if (days < 0) return t('debts.overdue', { days: Math.abs(days) });
  if (days <= 7) return t('debts.dueIn', { days });

  return date.toLocaleDateString();
}

export function sortDebtsByUrgency(debts: Debt[]): Debt[] {
  return [...debts].sort((a, b) => {
    const urgencyOrder: Record<DebtUrgency, number> = {
      overdue: 0,
      urgent: 1,
      soon: 2,
      normal: 3,
      none: 4,
    };

    const aUrgency = getDebtUrgency(a);
    const bUrgency = getDebtUrgency(b);

    // First sort by urgency
    if (urgencyOrder[aUrgency] !== urgencyOrder[bUrgency]) {
      return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
    }

    // Then by due date (earliest first)
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }

    // Debts with due dates come before those without
    if (a.due_at && !b.due_at) return -1;
    if (!a.due_at && b.due_at) return 1;

    // Finally by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
