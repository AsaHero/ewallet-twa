import { useEffect, useMemo, useState } from 'react';
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
  label?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: DateRange;
  onApply: (v: DateRange) => void;
};

type PresetKey =
  | 'thisMonth'
  | 'lastMonth'
  | 'thisWeek'
  | 'lastWeek'
  | 'last30Days'
  | 'custom';

function toInputDate(d: Date) {
  return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
}

function parseInputDate(s: string) {
  // new Date('yyyy-mm-dd') is OK in modern browsers (treated as UTC sometimes),
  // but for date-only UX, we normalize with start/endOfDay later.
  const d = new Date(s);
  return isValid(d) ? d : null;
}

function computePreset(key: PresetKey) {
  const now = new Date();

  switch (key) {
    case 'thisMonth': {
      const from = startOfDay(startOfMonth(now));
      const to = endOfDay(endOfMonth(now));
      return { from, to };
    }
    case 'lastMonth': {
      const m = subMonths(now, 1);
      const from = startOfDay(startOfMonth(m));
      const to = endOfDay(endOfMonth(m));
      return { from, to };
    }
    case 'thisWeek': {
      const from = startOfDay(startOfWeek(now, { weekStartsOn: 1 }));
      const to = endOfDay(endOfWeek(now, { weekStartsOn: 1 }));
      return { from, to };
    }
    case 'lastWeek': {
      const w = subWeeks(now, 1);
      const from = startOfDay(startOfWeek(w, { weekStartsOn: 1 }));
      const to = endOfDay(endOfWeek(w, { weekStartsOn: 1 }));
      return { from, to };
    }
    case 'last30Days': {
      const from = startOfDay(subDays(now, 30));
      const to = endOfDay(now);
      return { from, to };
    }
    case 'custom':
    default:
      return null;
  }
}

export function DateRangeSheet({ open, onOpenChange, value, onApply }: Props) {
  const { t } = useTranslation();

  const presets: { key: PresetKey; label: string }[] = useMemo(
    () => [
      { key: 'thisMonth', label: t('history.dateRange.thisMonth') },
      { key: 'lastMonth', label: t('history.dateRange.lastMonth') },
      { key: 'thisWeek', label: t('history.dateRange.thisWeek') },
      { key: 'lastWeek', label: t('history.dateRange.lastWeek') },
      { key: 'last30Days', label: t('history.dateRange.last30Days') },
      { key: 'custom', label: t('history.dateRange.custom') },
    ],
    [t]
  );

  const [fromDate, setFromDate] = useState<string>(toInputDate(value.from));
  const [toDate, setToDate] = useState<string>(toInputDate(value.to));
  const [activePreset, setActivePreset] = useState<PresetKey>(
    (value.label as PresetKey) || 'custom'
  );

  // ✅ Keep local state in sync when sheet opens or parent value changes.
  useEffect(() => {
    if (!open) return;
    setFromDate(toInputDate(value.from));
    setToDate(toInputDate(value.to));
    setActivePreset(((value.label as PresetKey) || 'custom') as PresetKey);
  }, [open, value.from, value.to, value.label]);

  const handlePresetSelect = (key: PresetKey) => {
    setActivePreset(key);

    const computed = computePreset(key);
    if (!computed) return; // custom => don't overwrite input

    setFromDate(toInputDate(computed.from));
    setToDate(toInputDate(computed.to));
  };

  const parsedFrom = useMemo(() => parseInputDate(fromDate), [fromDate]);
  const parsedTo = useMemo(() => parseInputDate(toDate), [toDate]);

  const canApply = !!parsedFrom && !!parsedTo;

  const handleApply = () => {
    if (!parsedFrom || !parsedTo) return;

    // Ensure from <= to
    const a = parsedFrom;
    const b = parsedTo;

    const finalFrom = startOfDay(a <= b ? a : b);
    const finalTo = endOfDay(a <= b ? b : a);

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
            <div className="rounded-t-3xl bg-background shadow-2xl border border-border/50 overflow-hidden">
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
                    className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95"
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
                        'relative px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left',
                        activePreset === preset.key
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                          : 'bg-muted/30 text-foreground hover:bg-muted/50 border border-transparent'
                      )}
                    >
                      {preset.label}
                      {activePreset === preset.key && (
                        <motion.div
                          layoutId="date-preset-check"
                          className="absolute right-3 top-3.5"
                        >
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
              <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-background/50 backdrop-blur-xl">
                <button
                  onClick={handleApply}
                  disabled={!canApply}
                  className={cn(
                    'w-full h-12 rounded-2xl font-semibold transition-transform shadow-lg',
                    canApply
                      ? 'bg-primary text-primary-foreground active:scale-[0.99] shadow-primary/20'
                      : 'bg-muted text-muted-foreground cursor-not-allowed shadow-transparent'
                  )}
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
