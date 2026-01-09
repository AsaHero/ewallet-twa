import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Save, Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Account } from '@/core/types';
import { formatCurrency } from '@/lib/formatters';
import { Switch } from '@/components/ui/switch';

type Props = {
    account: Account | null;
    currencyCode?: string;
    locale?: string;
    onClose: () => void;
    onSave: (accountId: string, data: { name?: string; is_default?: boolean }) => Promise<void>;
};

export function AccountActionsSheet({
    account,
    currencyCode = 'USD',
    locale,
    onClose,
    onSave,
}: Props) {
    const { t } = useTranslation();
    const isOpen = !!account;

    const [name, setName] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!account) return;
        setName(account.name ?? '');
        setIsDefault(!!account.is_default);
        setIsSubmitting(false);
    }, [account]);

    const hasChanged = useMemo(() => {
        if (!account) return false;
        return name.trim() !== account.name || isDefault !== account.is_default;
    }, [account, name, isDefault]);

    const canSubmit = !!account && hasChanged && name.trim().length > 0 && !isSubmitting;

    const handleClose = () => {
        if (!isSubmitting) onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!account || !canSubmit) return;

        setIsSubmitting(true);
        try {
            const updates: { name?: string; is_default?: boolean } = {};
            const trimmed = name.trim();

            if (trimmed !== account.name) updates.name = trimmed;
            if (isDefault !== account.is_default) updates.is_default = isDefault;

            await onSave(account.id, updates);
            onClose();
        } catch (err) {
            console.error('Failed to update account:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && account && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-2"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <form
                            onSubmit={handleSubmit}
                            className="rounded-t-[28px] bg-background shadow-2xl border border-border/50 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-4 pt-3 pb-3 border-b border-border/50">
                                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <h2 className="text-base font-semibold text-foreground truncate">
                                            {t('accounts.editAccount')}
                                        </h2>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {t('accounts.manageAccountSubtitle', { name: account.name })}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95"
                                        aria-label={t('common.close')}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-4 py-4 space-y-5 max-h-[65vh] overflow-y-auto overscroll-contain">
                                {/* Name */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground ml-1">
                                        {t('accounts.accountName')}
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('accounts.namePlaceholder')}
                                        className={cn(
                                            'w-full h-12 px-4 rounded-2xl bg-muted/25 border border-border/50',
                                            'focus:outline-none focus:ring-2 focus:ring-primary/30',
                                            'text-base'
                                        )}
                                    // ✅ no autoFocus (prevents keyboard pop)
                                    />
                                </div>

                                {/* Balance (Disabled input - Coming soon) */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-sm font-medium text-foreground">
                                            {t('accounts.balance')}
                                        </label>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                                            {t('accounts.comingSoon')}
                                        </span>
                                    </div>

                                    <div className="relative">
                                        <input
                                            value={formatCurrency(account.balance, currencyCode, locale)}
                                            disabled
                                            readOnly
                                            className={cn(
                                                'w-full h-16 rounded-2xl px-4 text-center',
                                                'text-[clamp(1.25rem,5vw,1.75rem)] font-bold tabular-nums tracking-tight',
                                                'bg-muted/20 border border-border/30',
                                                'disabled:opacity-100 disabled:cursor-not-allowed'
                                            )}
                                        />
                                        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
                                    </div>

                                    <p className="text-xs text-muted-foreground ml-1 flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5" />
                                        {t('accounts.balanceAdjustmentInfo')}
                                    </p>
                                </div>

                                {/* Default toggle */}
                                <div className="rounded-2xl border border-border/40 bg-muted/15 px-4 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground">
                                                {t('accounts.defaultAccount')}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('accounts.defaultAccountDescription')}
                                            </p>
                                        </div>

                                        <Switch
                                            checked={isDefault}
                                            onCheckedChange={setIsDefault}
                                            aria-label={t('accounts.defaultAccount')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-background/70 backdrop-blur-xl">
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className={cn(
                                        'w-full h-12 rounded-2xl font-semibold transition-all',
                                        'flex items-center justify-center gap-2 shadow-lg',
                                        canSubmit
                                            ? 'bg-primary text-primary-foreground active:scale-[0.99] shadow-primary/20'
                                            : 'bg-muted text-muted-foreground cursor-not-allowed shadow-transparent'
                                    )}
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {isSubmitting ? t('common.loading') : t('common.save')}
                                </button>

                                <div className="h-safe-bottom" />
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
