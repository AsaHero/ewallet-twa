import moment from 'moment-timezone';

export function formatCurrency(
    amount: number,
    currencyCode: string = 'USD',
    locale?: string
): string {
    return new Intl.NumberFormat(locale || 'en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

// Convert timezone string to minutes
// Supports legacy "UTC+5" format AND standard IANA "Asia/Tashkent" format
export function getTimezoneOffsetMinutes(timezone?: string): number {
  if (!timezone) return 0;

  // 1. Try legacy "UTC+N" parsing
  if (timezone.toUpperCase().startsWith('UTC') || timezone.toUpperCase().startsWith('GMT')) {
    const cleaned = timezone.toUpperCase().replace('UTC', '').replace('GMT', '').trim();
    if (!cleaned) return 0;

    const match = cleaned.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/);
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hours = parseInt(match[2], 10) || 0;
      const minutes = parseInt(match[3] || '0', 10) || 0;
      return sign * (hours * 60 + minutes);
    }
  }

  // 2. Try IANA timezone (e.g. "Asia/Tashkent") using moment-timezone
  if (moment.tz.zone(timezone)) {
      return moment.tz(timezone).utcOffset();
  }

  return 0;
}

// Convert a date to user's timezone (offset-based) while keeping backend values in UTC
export function convertToTimezone(
  dateInput: string | number | Date,
  timezone?: string,
): Date {
  const baseDate =
    typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : new Date(dateInput.getTime());

  const timestamp = baseDate.getTime();
  if (Number.isNaN(timestamp)) {
    return new Date();
  }

  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  // We add the offset to the UTC timestamp to create a "shifted" date object
  // where the UTC components match the local time in target timezone.
  // Note: This date object's UTC get methods should be used to read the local time values.
  return new Date(timestamp + offsetMinutes * 60 * 1000);
}

// Format date to readable format
export function formatDate(
  dateInput: string | Date,
  options: { timezone?: string; locale?: string } | string = {},
  legacyLocale?: string
): string {
  return formatDateCompatible(dateInput, options, legacyLocale);
}

function formatDateCompatible(
    dateInput: string | Date,
    timezoneOrOptions?: string | { timezone?: string; locale?: string },
    localeArg?: string
): string {
  let timezone: string | undefined;
  let locale = 'en-US';

  if (typeof timezoneOrOptions === 'string') {
      timezone = timezoneOrOptions;
      if (localeArg) locale = localeArg;
  } else if (timezoneOrOptions) {
      timezone = timezoneOrOptions.timezone;
      if (timezoneOrOptions.locale) locale = timezoneOrOptions.locale;
  }

  // Shift to the user's timezone first, then format in UTC to avoid host timezone side effects
  const date = convertToTimezone(dateInput, timezone);
  const now = convertToTimezone(new Date(), timezone);

  const dateKey = date.toISOString().slice(0, 10);
  const todayKey = now.toISOString().slice(0, 10);

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const isToday = dateKey === todayKey;
  const isYesterday = dateKey === yesterdayKey;

  if (isToday) {
    return `Today, ${date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })}`;
  }

  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })}`;
  }

  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function formatDateTime(
  dateInput: string | Date,
  timezone?: string,
  locale: string = 'en-US',
  formatOptions?: Intl.DateTimeFormatOptions
): string {
    const date = convertToTimezone(dateInput, timezone);

    return date.toLocaleString(locale, {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...formatOptions,
    });
}

// Transaction grouping and statistics helpers
export interface GroupedTransactions {
    [dateLabel: string]: any[];
}

export interface MonthlyStats {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
}

export function groupTransactionsByDate(
    transactions: any[],
    timezone?: string,
    locale?: string
): GroupedTransactions {
    const groups: GroupedTransactions = {};

    // Calculate Today and Yesterday keys in User Timezone
    const nowShifted = convertToTimezone(new Date(), timezone);
    const todayKeyCorrect = nowShifted.toISOString().slice(0, 10);

    const yesterdayShifted = new Date(nowShifted);
    yesterdayShifted.setUTCDate(yesterdayShifted.getUTCDate() - 1);
    const yesterdayKeyCorrect = yesterdayShifted.toISOString().slice(0, 10);

    transactions.forEach((tx) => {
        const txShifted = convertToTimezone(tx.performed_at || tx.created_at, timezone);
        const txKey = txShifted.toISOString().slice(0, 10);

        // Label logic
        let label: string;
        if (txKey === todayKeyCorrect) {
            label = 'Today';
        } else if (txKey === yesterdayKeyCorrect) {
            label = 'Yesterday';
        } else {
            // "Jun 24" format (Date only)
            // Use formatDateTime or standard locale string
            label = txShifted.toLocaleDateString(locale || 'en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            });
        }

        if (!groups[label]) {
            groups[label] = [];
        }
        groups[label].push(tx);
    });

    return groups;
}

export function calculateMonthlyStats(transactions: any[]): MonthlyStats {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
        if (tx.type === 'deposit') {
            totalIncome += tx.amount; // Should be positive
        } else if (tx.type === 'withdrawal') {
            totalExpense += Math.abs(tx.amount); // Should be negative, so take absolute value
        }
    });

    return {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
    };
}

export function formatMonthYear(date: Date, locale?: string): string {
    return new Intl.DateTimeFormat(locale || 'en-US', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}

export function getMonthDateRange(date: Date): { from: Date; to: Date } {
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
}
