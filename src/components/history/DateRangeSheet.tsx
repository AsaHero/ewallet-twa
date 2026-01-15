import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
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
  parse,
} from 'date-fns';

import { cn } from '@/lib/utils';
import { BottomSheetShell } from '@/components/ui/BottomSheetShell';

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
  if (!s?.trim()) return null;
  const d = parse(s, 'yyyy-MM-dd', new Date()); // safe, no UTC shift surprises
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

function formatPreview(from: Date, to: Date) {
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();

  if (sameMonth) return `${format(from, 'MMM d')} – ${format(to, 'd, yyyy')}`;
  if (sameYear) return `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`;
  return `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`;
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
    ((value.label as PresetKey) || 'custom') as PresetKey
  );

  // keep local state in sync when opening
  useEffect(() => {
    if (!open) return;
    setFromDate(toInputDate(value.from));
    setToDate(toInputDate(value.to));
    setActivePreset(((value.label as PresetKey) || 'custom') as PresetKey);
  }, [open, value.from, value.to, value.label]);

  const parsedFrom = useMemo(() => parseInputDate(fromDate), [fromDate]);
  const parsedTo = useMemo(() => parseInputDate(toDate), [toDate]);

  const canApply = !!parsedFrom && !!parsedTo;

  const previewText = useMemo(() => {
    if (!parsedFrom || !parsedTo) return t('history.dateRange.previewPlaceholder');
    const a = parsedFrom <= parsedTo ? parsedFrom : parsedTo;
    const b = parsedFrom <= parsedTo ? parsedTo : parsedFrom;
    return formatPreview(a, b);
  }, [parsedFrom, parsedTo, t]);

  const handlePresetSelect = (key: PresetKey) => {
    setActivePreset(key);

    const computed = computePreset(key);
    if (!computed) return;

    setFromDate(toInputDate(computed.from));
    setToDate(toInputDate(computed.to));
  };

  const handleApply = () => {
    if (!parsedFrom || !parsedTo) return;

    const a = parsedFrom;
    const b = parsedTo;

    const finalFrom = startOfDay(a <= b ? a : b);
    const finalTo = endOfDay(a <= b ? b : a);

    onApply({ from: finalFrom, to: finalTo, label: activePreset });
    onOpenChange(false);
  };

  return (
    <BottomSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={t('history.dateRange.title')}
      subtitle={previewText}
      icon={<CalendarIcon className="w-5 h-5 text-primary" />}
      footer={
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply}
          className={cn(
            'w-full h-12 rounded-2xl font-semibold transition-all shadow-lg',
            canApply
              ? 'bg-primary text-primary-foreground active:scale-[0.99] shadow-primary/20'
              : 'bg-muted text-muted-foreground cursor-not-allowed shadow-transparent'
          )}
        >
          {t('history.dateRange.apply')}
        </button>
      }
    >
      <div className="space-y-5">
        {/* Presets (premium pills) */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const selected = activePreset === preset.key;

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePresetSelect(preset.key)}
                className={cn(
                  'relative h-10 px-4 rounded-full text-sm font-semibold',
                  'transition-colors active:scale-[0.99]',
                  'focus:outline-none focus:ring-2 focus:ring-primary/25',
                  selected
                    ? 'text-primary-foreground'
                    : 'text-foreground bg-card/40 hover:bg-card/60 border border-border/40'
                )}
              >
                {selected && (
                  <span className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/15" />
                )}

                <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                  {selected && <Check className="w-4 h-4" />}
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom inputs */}
        <div className="rounded-3xl border border-border/40 bg-card/30 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
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
                className={cn(
                  'w-full h-11 px-3 rounded-2xl bg-background border border-border/50',
                  'focus:outline-none focus:ring-2 focus:ring-primary/25 text-sm'
                )}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
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
                className={cn(
                  'w-full h-11 px-3 rounded-2xl bg-background border border-border/50',
                  'focus:outline-none focus:ring-2 focus:ring-primary/25 text-sm'
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </BottomSheetShell>
  );
}
