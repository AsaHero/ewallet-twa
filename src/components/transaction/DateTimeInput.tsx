import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useFormContext, Controller } from 'react-hook-form';
import type { ParsedTransaction } from '@/core/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { getTimezoneOffsetMinutes } from '@/lib/formatters';

// Helper to convert UTC string to Wall Time string (YYYY-MM-DDTHH:mm) in target timezone
function toWallTime(dateStr: string | Date | undefined | null, timeZone: string): string {
  if (!dateStr) return '';
  try {
     const date = new Date(dateStr);
     if (isNaN(date.getTime())) return '';

     const offsetMinutes = getTimezoneOffsetMinutes(timeZone);
     // Shift UTC to Wall time
     const wallMs = date.getTime() + offsetMinutes * 60 * 1000;
     const wallDate = new Date(wallMs);

     return wallDate.toISOString().slice(0, 16);
  } catch (e) {
    console.error("toWallTime error", e);
    return '';
  }
}

// Helper to convert Wall Time string to UTC string
function fromWallTime(wallStr: string, timeZone: string): string {
  if (!wallStr) return '';
  try {
      const offsetMinutes = getTimezoneOffsetMinutes(timeZone);
      // Treat the wall string as if it were UTC to get the "face value" timestamp
      const faceValueUtc = new Date(wallStr + 'Z').getTime();
      if (isNaN(faceValueUtc)) return '';

      // Subtract offset to get back to real UTC
      // RealUTC + Offset = Wall
      // RealUTC = Wall - Offset
      const realUtcMs = faceValueUtc - offsetMinutes * 60 * 1000;
      return new Date(realUtcMs).toISOString();
  } catch (e) {
      console.error("fromWallTime error", e);
      return '';
  }
}

export function DateTimeInput() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { control } = useFormContext<ParsedTransaction>();

  // If user has no timezone, default to browser local
  const userTimezone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
          <Calendar className="inline w-3 h-3 mr-1" />
          {t('transaction.date')}
        </label>

        <Controller
          control={control}
          name="performed_at"
          render={({ field }) => {
            // value is UTC string "2023-12-25T15:00:00.000Z"
            // We want to display Wall Time in User Timezone
            const displayValue = toWallTime(field.value, userTimezone);

            return (
              <input
                type="datetime-local"
                value={displayValue}
                onChange={(e) => {
                  const wallStr = e.target.value; // "2023-12-25T10:00"
                  if (!wallStr) {
                    // Don't set undefined if cleared? Or set current time?
                    // User might want to clear it, but form expects date.
                    // Let's set undefined.
                    field.onChange(undefined);
                    return;
                  }
                  const utcStr = fromWallTime(wallStr, userTimezone);
                  field.onChange(utcStr);
                }}
                className="w-full px-4 py-3 bg-background rounded-xl border-2 border-transparent focus:outline-none focus:border-primary"
              />
            );
          }}
        />
        <p className="text-[11px] text-muted-foreground mt-2">
           {t('common.timezone')}: {userTimezone}
           {/* Debug info if needed: offset {getTimezoneOffsetMinutes(userTimezone)} */}
        </p>
      </CardContent>
    </Card>
  );
}

