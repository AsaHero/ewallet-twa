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

export function formatDate(
    date: string | Date,
    timezone?: string,
    locale?: string
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(locale || 'en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(dateObj);
}

export function formatDateTime(
    date: string | Date,
    timezone?: string,
    locale?: string
): string {
    let dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };

    try {
        if (timezone) {
            // Check for custom UTC formats like "UTC+5", "UTC+05:00", "UTC-3"
            const utcMatch = timezone.match(/^UTC([+-])(\d{1,2})(?::(\d{2}))?$/);

            if (utcMatch) {
                // Parse offset
                const sign = utcMatch[1] === '+' ? 1 : -1;
                const hours = parseInt(utcMatch[2], 10);
                const minutes = utcMatch[3] ? parseInt(utcMatch[3], 10) : 0;

                // Calculate total offset in milliseconds
                const offsetMs = sign * (hours * 60 + minutes) * 60 * 1000;

                // Adjust date to the target timezone
                // We add the offset to the UTC time to shift it to the "local" time of that zone
                // Then we format it as UTC to display the shifted time "as is"
                dateObj = new Date(dateObj.getTime() + offsetMs);
                options.timeZone = 'UTC';
            } else {
                // Standard IANA timezone (e.g., "Europe/London")
                options.timeZone = timezone;
            }
        }

        return new Intl.DateTimeFormat(locale || 'en-US', options).format(dateObj);
    } catch (e) {
        console.warn(`Invalid timezone '${timezone}', falling back to default`, e);
        // Fallback without timezone (uses local system time)
        delete options.timeZone;
        return new Intl.DateTimeFormat(locale || 'en-US', options).format(dateObj);
    }
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
    const now = new Date();

    // Get today and yesterday in the user's timezone
    const todayStr = formatDate(now, timezone, locale);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday, timezone, locale);

    transactions.forEach((tx) => {
        const txDate = formatDate(tx.performed_at || tx.created_at, timezone, locale);

        let label: string;
        if (txDate === todayStr) {
            label = 'Today';
        } else if (txDate === yesterdayStr) {
            label = 'Yesterday';
        } else {
            label = txDate;
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
            totalIncome += tx.amount;
        } else if (tx.type === 'withdrawal') {
            totalExpense += tx.amount;
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

