import { useRef, useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ParsedTransaction } from '@/core/types';

type LastEdited = "amount" | "original_amount" | "fx_rate" | null;

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function useMoneySync({
  watch,
  setValue,
}: {
  watch: UseFormReturn<ParsedTransaction>["watch"];
  setValue: UseFormReturn<ParsedTransaction>["setValue"];
}) {
  const lastEdited = useRef<LastEdited>(null);

  const amount = watch("amount");
  const original = watch("original_amount");
  const fx = watch("fx_rate");

  const markEdited = (k: Exclude<LastEdited, null>) => {
    lastEdited.current = k;
  };

  // When fx changes: recompute the opposite side based on last-edited anchor
  useEffect(() => {
    if (!fx || fx <= 0) return;

    const anchor = lastEdited.current;

    if (anchor === "amount") {
      if (typeof amount === "number" && amount > 0) {
        const nextOriginal = round2(amount / fx);
        if (nextOriginal !== original) {
          setValue("original_amount", nextOriginal, { shouldDirty: true });
        }
      }
      return;
    }

    // default anchor: original_amount (or unknown)
    if (typeof original === "number" && original > 0) {
      const nextAmount = round2(original * fx);
      if (nextAmount !== amount) {
        setValue("amount", nextAmount, { shouldDirty: true });
      }
    }
  }, [fx]); // eslint-disable-line react-hooks/exhaustive-deps

  // When original changes and it was the driver
  useEffect(() => {
    if (!fx || fx <= 0) return;
    if (lastEdited.current !== "original_amount") return;
    if (typeof original !== "number" || original <= 0) return;

    const nextAmount = round2(original * fx);
    if (nextAmount !== amount) setValue("amount", nextAmount, { shouldDirty: true });
  }, [original]); // eslint-disable-line react-hooks/exhaustive-deps

  // When amount changes and it was the driver
  useEffect(() => {
    if (!fx || fx <= 0) return;
    if (lastEdited.current !== "amount") return;
    if (typeof amount !== "number" || amount <= 0) return;

    const nextOriginal = round2(amount / fx);
    if (nextOriginal !== original) setValue("original_amount", nextOriginal, { shouldDirty: true });
  }, [amount]); // eslint-disable-line react-hooks/exhaustive-deps

  return { markEdited };
}
