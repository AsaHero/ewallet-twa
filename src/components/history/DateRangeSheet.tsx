import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Calendar as CalendarIcon, Check } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subDays,
  startOfDay,
  endOfDay,
  format,
  isValid,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export type DateRange = {
  from: Date;
  to: Date;
  label?: string; // e.g. 'custom', 'thisMonth', etc. used for highlighting
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: DateRange;
  onApply: (v: DateRange) => void;
};

type PresetKey = 'thisMonth' | 'lastMonth' | 'thisWeek' | 'lastWeek' | 'last30Days' | 'custom';

export function DateRangeSheet({ open, onOpenChange, value, onApply }: Props) {
  const { t } = useTranslation();

  // Local state for custom range inputs
  // Initialize with current value
  const [fromDate, setFromDate] = useState<string>(
    isValid(value.from) ? format(value.from, 'yyyy-MM-dd') : ''
  );
  const [toDate, setToDate] = useState<string>(
    isValid(value.to) ? format(value.to, 'yyyy-MM-dd') : ''
  );

  const [activePreset, setActivePreset] = useState<PresetKey>(
    (value.label as PresetKey) || 'custom'
  );

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'thisMonth', label: t('history.dateRange.thisMonth') },
    { key: 'lastMonth', label: t('history.dateRange.lastMonth') },
    { key: 'thisWeek', label: t('history.dateRange.thisWeek') },
    { key: 'lastWeek', label: t('history.dateRange.lastWeek') },
    { key: 'last30Days', label: t('history.dateRange.last30Days') },
    { key: 'custom', label: t('history.dateRange.custom') },
  ];

  const handlePresetSelect = (key: PresetKey) => {
    setActivePreset(key);
    const now = new Date();

    let newFrom = now;
    let newTo = now;

    switch (key) {
      case 'thisMonth':
        newFrom = startOfMonth(now);
        newTo = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        newFrom = startOfMonth(lastMonth);
        newTo = endOfMonth(lastMonth);
        break;
      case 'thisWeek':
        newFrom = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        newTo = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        newFrom = startOfWeek(lastWeek, { weekStartsOn: 1 });
        newTo = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case 'last30Days':
        newFrom = subDays(now, 30);
        newTo = endOfDay(now);
        break;
      case 'custom':
        // Don't change dates, just let user edit
        return;
    }

    // Automatically apply presets
    setFromDate(format(newFrom, 'yyyy-MM-dd'));
    setToDate(format(newTo, 'yyyy-MM-dd'));
  };

  const handleApply = () => {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Validate
    if (!isValid(from) || !isValid(to)) {
        return;
    }

    // Ensure from <= to
    const finalFrom = startOfDay(from < to ? from : to);
    const finalTo = endOfDay(from < to ? to : from);

    onApply({
      from: finalFrom,
      to: finalTo,
      label: activePreset,
    });
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-t-3xl bg-background shadow-2xl border border-border/50">
              {/* Header */}
              <div className="px-4 pt-3 pb-2 border-b border-border/50">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
                <div className="mt-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    {t('history.dateRange.title')}
                  </h2>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4 max-h-[72vh] overflow-y-auto overscroll-contain space-y-5">

                {/* Presets Grid */}
                <div className="grid grid-cols-2 gap-2">
                    {presets.map((preset) => (
                        <button
                            key={preset.key}
                            onClick={() => handlePresetSelect(preset.key)}
                            className={cn(
                                "relative px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left",
                                activePreset === preset.key
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                    : "bg-muted/30 text-foreground hover:bg-muted/50 border border-transparent"
                            )}
                        >
                            {preset.label}
                            {activePreset === preset.key && (
                                <motion.div layoutId="check" className="absolute right-3 top-3.5">
                                    <Check className="w-4 h-4" />
                                </motion.div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Custom Date Inputs */}
                <Card className="p-4 bg-muted/20 border-border/40">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground ml-1">
                                {t('history.dateRange.from')}
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => {
                                    setFromDate(e.target.value);
                                    setActivePreset('custom');
                                }}
                                className="w-full h-11 px-3 rounded-xl bg-background border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground ml-1">
                                {t('history.dateRange.to')}
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => {
                                    setToDate(e.target.value);
                                    setActivePreset('custom');
                                }}
                                className="w-full h-11 px-3 rounded-xl bg-background border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                            />
                        </div>
                    </div>
                </Card>

              </div>

              {/* Footer */}
              <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-background/50 backdrop-blur-xl rounded-t-none">
                <button
                  onClick={handleApply}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.99] transition-transform shadow-lg shadow-primary/20"
                >
                  {t('history.dateRange.apply')}
                </button>
                <div className="h-safe-bottom" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
