import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, subDays, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

export type PresetType = 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

interface QuickFilterPresetsProps {
  activePreset: PresetType;
  onSelectPreset: (preset: PresetType) => void;
  onCustomClick: () => void;
}

export function getPresetDateRange(preset: PresetType): DateRange | null {
  const now = new Date();

  switch (preset) {
    case 'last7':
      return {
        from: subDays(now, 6),
        to: now,
        label: 'last7'
      };

    case 'last30':
      return {
        from: subDays(now, 29),
        to: now,
        label: 'last30'
      };

    case 'thisMonth':
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
        label: 'thisMonth'
      };

    case 'lastMonth': {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: 'lastMonth'
      };
    }

    case 'thisQuarter':
      return {
        from: startOfQuarter(now),
        to: endOfQuarter(now),
        label: 'thisQuarter'
      };

    case 'thisYear':
      return {
        from: startOfYear(now),
        to: endOfYear(now),
        label: 'thisYear'
      };

    default:
      return null;
  }
}

export function QuickFilterPresets({
  activePreset,
  onSelectPreset,
  onCustomClick
}: QuickFilterPresetsProps) {
  const { t } = useTranslation();

  const presets: { key: PresetType; label: string }[] = [
    { key: 'last7', label: t('stats.presets.last7days') || 'Last 7 days' },
    { key: 'last30', label: t('stats.presets.last30days') || 'Last 30 days' },
    { key: 'thisMonth', label: t('stats.presets.thisMonth') || 'This Month' },
    { key: 'lastMonth', label: t('stats.presets.lastMonth') || 'Last Month' },
    { key: 'thisQuarter', label: t('stats.presets.thisQuarter') || 'This Quarter' },
    { key: 'thisYear', label: t('stats.presets.thisYear') || 'This Year' },
  ];

  const handlePresetClick = (preset: PresetType) => {
    if (preset === 'custom') {
      onCustomClick();
    } else {
      onSelectPreset(preset);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {presets.map((preset) => (
        <button
          key={preset.key}
          onClick={() => handlePresetClick(preset.key)}
          className={cn(
            'px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
            activePreset === preset.key
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'bg-card/50 border border-border/50 hover:bg-card/70 text-foreground'
          )}
        >
          {preset.label}
        </button>
      ))}

      <button
        onClick={onCustomClick}
        className={cn(
          'px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
          activePreset === 'custom'
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
            : 'bg-card/50 border border-border/50 hover:bg-card/70 text-foreground'
        )}
      >
        {t('stats.presets.custom') || 'Custom'}
      </button>
    </div>
  );
}
