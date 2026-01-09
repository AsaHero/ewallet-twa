import { Plus, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Account } from '@/core/types';

type Props = {
    accounts: Account[];
    totalBalance: number;
    currencyCode?: string;
    locale?: string;
    onAccountTap: (account: Account) => void;
    onAddAccountTap: () => void;
};

function clampPct(v: number) {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
}

export function AccountListCard({
    accounts,
    totalBalance,
    currencyCode = 'USD',
    locale,
    onAccountTap,
    onAddAccountTap,
}: Props) {
    const { t } = useTranslation();

    return (
        <Card className="rounded-3xl border border-border/40 bg-card/40 overflow-hidden">
            <CardContent className="p-0">
                {/* Account rows */}
                {accounts.map((account, index) => {
                    const isLast = index === accounts.length - 1;

                    // NOTE: if you allow negatives and want share-of-assets, consider Math.abs
                    const rawPct = totalBalance > 0 ? (account.balance / totalBalance) * 100 : 0;
                    console.log(`[AccountListCard] Account: ${account.name}, Balance: ${account.balance}, Total: ${totalBalance}, RawPct: ${rawPct}`);
                    const pct = clampPct(rawPct);

                    return (
                        <button
                            key={account.id}
                            onClick={() => onAccountTap(account)}
                            className={cn(
                                'relative w-full text-left',
                                'px-4 py-4',
                                'transition-colors active:bg-muted/40 hover:bg-muted/25',
                                !isLast && 'border-b border-border/30'
                            )}
                        >
                            {/* Default indicator (subtle left rail, no width competition) */}
                            {account.is_default && (
                                <span
                                    className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary"
                                    aria-hidden="true"
                                />
                            )}

                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[15px] font-semibold text-foreground truncate">
                                            {account.name}
                                        </span>

                                        {/* Optional: very subtle label WITHOUT stealing layout
                        - kept off by default, uncomment if you really want it
                        - it will still take width, so only use if needed
                    */}
                                        {/* {account.is_default && (
                      <span className="sr-only">{t('accounts.default')}</span>
                    )} */}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-2 w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary/80 rounded-full transition-[width] duration-300 ease-out"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[15px] font-semibold text-foreground tabular-nums whitespace-nowrap">
                                        {formatCurrency(account.balance, currencyCode, locale)}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                </div>
                            </div>
                        </button>
                    );
                })}

                {/* Add account row */}
                <button
                    onClick={onAddAccountTap}
                    className={cn(
                        'w-full text-left px-4 py-4',
                        'transition-colors active:bg-muted/40 hover:bg-muted/25',
                        accounts.length > 0 && 'border-t border-border/30'
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-muted/40 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[15px] font-medium text-foreground">
                                    {t('accounts.addAccount')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t('accounts.addAccountSubtitle')}
                                </p>
                            </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                </button>
            </CardContent>
        </Card>
    );
}
