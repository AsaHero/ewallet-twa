import { useEffect, useRef } from 'react';
import { motion, animate, useMotionValue } from 'framer-motion';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type Props = {
    value: number;
    currencyCode?: string;
    locale?: string;
    className?: string;
};

export function AnimatedBalance({
    value,
    currencyCode = 'USD',
    locale,
    className,
}: Props) {
    const motionValue = useMotionValue(value);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // First render → no animation (instant)
        if (isFirstRender.current) {
            motionValue.set(value);
            isFirstRender.current = false;
            return;
        }

        // Subsequent updates → fast, premium animation
        const controls = animate(motionValue, value, {
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
        });

        return () => controls.stop();
    }, [value, motionValue]);

    return (
        <div
            className={cn(
                'max-w-full overflow-hidden px-3',
                className
            )}
        >
            <motion.span
                className="
          block
          text-center
          font-bold
          tabular-nums
          tracking-tight
          leading-none
          whitespace-nowrap
          text-[clamp(2rem,8vw,3.25rem)]
          text-foreground
        "
            >
                {formatCurrency(
                    Math.round(motionValue.get()),
                    currencyCode,
                    locale
                )}
            </motion.span>
        </div>
    );
}
