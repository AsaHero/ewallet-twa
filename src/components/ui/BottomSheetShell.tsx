import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

type BottomSheetShellProps = {
    open: boolean;
    onOpenChange: (v: boolean) => void;

    title?: string;
    subtitle?: string;
    icon?: ReactNode;

    children: ReactNode;

    footer?: ReactNode;

    maxWidthClassName?: string; // default: max-w-md
    contentClassName?: string;
    sheetClassName?: string;
    showClose?: boolean;

    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean; // optional: we can support later if needed
};

export function BottomSheetShell({
    open,
    onOpenChange,
    title,
    subtitle,
    icon,
    children,
    footer,
    maxWidthClassName = 'max-w-md',
    contentClassName,
    sheetClassName,
    showClose = true,
    closeOnBackdrop = true,
}: BottomSheetShellProps) {
    const handleClose = () => onOpenChange(false);

    // Lock body scroll when bottom sheet is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [open]);

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
                        onClick={closeOnBackdrop ? handleClose : undefined}
                    />

                    {/* Sheet */}
                    <motion.div
                        className={cn('fixed inset-x-0 bottom-0 z-50 mx-auto w-full px-2', maxWidthClassName)}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className={cn(
                                'rounded-t-[28px] bg-background shadow-2xl border border-border/50 overflow-hidden',
                                sheetClassName
                            )}
                            role="dialog"
                            aria-modal="true"
                        >
                            {/* Header */}
                            <div className="px-4 pt-3 pb-3 border-b border-border/50">
                                <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex items-center gap-2">
                                        {icon && (
                                            <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                {icon}
                                            </div>
                                        )}

                                        <div className="min-w-0">
                                            {title && (
                                                <h2 className="text-base font-semibold text-foreground truncate">
                                                    {title}
                                                </h2>
                                            )}
                                            {subtitle && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {subtitle}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {showClose && (
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95"
                                            aria-label="Close"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div
                                className={cn(
                                    'px-4 py-4 max-h-[65vh] overflow-y-auto overscroll-contain',
                                    contentClassName
                                )}
                            >
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-background/70 backdrop-blur-xl">
                                    {footer}
                                    <div className="h-safe-bottom" />
                                </div>
                            )}
                            {!footer && <div className="h-safe-bottom" />}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
