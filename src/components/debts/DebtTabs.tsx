import { cn } from '@/lib/utils';

interface DebtTabsProps {
  activeTab: 'borrow' | 'lend';
  onTabChange: (tab: 'borrow' | 'lend') => void;
  borrowCount: number;
  lendCount: number;
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

export function DebtTabs({ activeTab, onTabChange, borrowCount, lendCount }: DebtTabsProps) {
  const handleTabClick = (tab: 'borrow' | 'lend') => {
    if (tab !== activeTab) {
      hapticSelect();
      onTabChange(tab);
    }
  };

  return (
    <div className="flex gap-2 p-1 rounded-2xl bg-muted/40">
      <button
        onClick={() => handleTabClick('borrow')}
        className={cn(
          'flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all',
          activeTab === 'borrow'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        I Borrowed
        {borrowCount > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500">
            {borrowCount}
          </span>
        )}
      </button>

      <button
        onClick={() => handleTabClick('lend')}
        className={cn(
          'flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all',
          activeTab === 'lend'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        I Lent
        {lendCount > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-green-500/20 text-green-500">
            {lendCount}
          </span>
        )}
      </button>
    </div>
  );
}
