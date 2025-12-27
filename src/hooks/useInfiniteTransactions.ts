import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { Transaction } from '@/core/types';

type TxType = 'withdrawal' | 'deposit';

export type TransactionsQuery = {
  from: string; // ISO
  to: string;   // ISO
  limit?: number;
  type?: TxType;
  category_ids?: number[];
  account_ids?: string[];
  min_amount?: number;
  max_amount?: number;
  search?: string;
};

type State = {
  items: Transaction[];
  total: number;
  offset: number;
  limit: number;
  isInitialLoading: boolean;
  isFetchingNext: boolean;
  error: string | null;
};

function stableKey(q: TransactionsQuery) {
  // Keep it stable and predictable; avoid functions/dates here.
  return JSON.stringify({
    ...q,
    // normalize empty arrays so they don't flap
    category_ids: q.category_ids?.length ? q.category_ids : undefined,
    account_ids: q.account_ids?.length ? q.account_ids : undefined,
    search: q.search?.trim() ? q.search.trim() : undefined,
  });
}

export function useInfiniteTransactions(query: TransactionsQuery) {
  const key = useMemo(() => stableKey(query), [query]);
  const limit = query.limit ?? 30;

  const [state, setState] = useState<State>({
    items: [],
    total: 0,
    offset: 0,
    limit,
    isInitialLoading: true,
    isFetchingNext: false,
    error: null,
  });

  const requestSeq = useRef(0);

  const fetchPage = useCallback(
    async (nextOffset: number) => {
      const seq = ++requestSeq.current;

      // If it's the first page we show a stronger loading state
      const isFirstPage = nextOffset === 0;

      setState((s) => ({
        ...s,
        isInitialLoading: isFirstPage ? true : s.isInitialLoading,
        isFetchingNext: isFirstPage ? false : true,
        error: null,
      }));

      try {
        const res = await apiClient.getTransactions({
          ...query,
          limit,
          offset: nextOffset,
          // normalize empty strings/arrays so server doesn't get noise
          search: query.search?.trim() ? query.search.trim() : undefined,
          category_ids: query.category_ids?.length ? query.category_ids : undefined,
          account_ids: query.account_ids?.length ? query.account_ids : undefined,
        });

        // Ignore stale responses
        if (seq !== requestSeq.current) return;

        setState((s) => {
          const merged = isFirstPage ? res.items : [...s.items, ...res.items];
          const newOffset = merged.length;

          return {
            ...s,
            items: merged,
            total: res.pagination.total,
            offset: newOffset,
            limit,
            isInitialLoading: false,
            isFetchingNext: false,
            error: null,
          };
        });
      } catch (e) {
        if (seq !== requestSeq.current) return;
        setState((s) => ({
          ...s,
          isInitialLoading: false,
          isFetchingNext: false,
          error: e instanceof Error ? e.message : 'Failed to load transactions',
        }));
      }
    },
    [query, limit]
  );

  const reset = useCallback(() => {
    requestSeq.current += 1; // invalidate in-flight
    setState((s) => ({
      ...s,
      items: [],
      total: 0,
      offset: 0,
      limit,
      isInitialLoading: true,
      isFetchingNext: false,
      error: null,
    }));
  }, [limit]);

  const fetchNext = useCallback(() => {
    setState((s) => {
      const hasNext = s.items.length < s.total;
      const busy = s.isInitialLoading || s.isFetchingNext;
      if (!hasNext || busy) return s;
      // fire and forget: we call fetchPage with current offset outside setState
      return { ...s };
    });

    // Use latest state via functional read
    fetchPage(state.offset);
  }, [fetchPage, state.offset]);

  const hasNext = state.items.length < state.total;

  // When query changes -> reset and fetch first page
  useEffect(() => {
    reset();
    // fetch first page immediately
    fetchPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    items: state.items,
    total: state.total,
    isInitialLoading: state.isInitialLoading,
    isFetchingNext: state.isFetchingNext,
    error: state.error,
    hasNext,
    fetchNext,
    refetch: () => fetchPage(0),
  };
}
