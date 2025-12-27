import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { Transaction } from '@/core/types';

type TxType = 'withdrawal' | 'deposit';

export type TransactionsQuery = {
  from: string;
  to: string;
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
  return JSON.stringify({
    ...q,
    limit: q.limit ?? 30,
    category_ids: q.category_ids?.length ? q.category_ids : undefined,
    account_ids: q.account_ids?.length ? q.account_ids : undefined,
    search: q.search?.trim() ? q.search.trim() : undefined,
  });
}

export function useInfiniteTransactions(query: TransactionsQuery) {
  const limit = query.limit ?? 30;
  const key = useMemo(() => stableKey(query), [query]);

  const [state, setState] = useState<State>({
    items: [],
    total: 0,
    offset: 0,
    limit,
    isInitialLoading: true,
    isFetchingNext: false,
    error: null,
  });

  // Refs to avoid stale closures / double-load
  const requestSeq = useRef(0);
  const offsetRef = useRef(0);
  const totalRef = useRef(0);
  const busyRef = useRef(false);

  const updateRefsFromState = (next: Partial<State>) => {
    if (typeof next.offset === 'number') offsetRef.current = next.offset;
    if (typeof next.total === 'number') totalRef.current = next.total;
    if (typeof next.isInitialLoading === 'boolean' || typeof next.isFetchingNext === 'boolean') {
      busyRef.current = !!(next.isInitialLoading || next.isFetchingNext);
    }
  };

  const fetchPage = useCallback(
    async (nextOffset: number) => {
      const seq = ++requestSeq.current;
      const isFirst = nextOffset === 0;

      busyRef.current = true;

      setState((s) => {
        const next: Partial<State> = {
          ...s,
          isInitialLoading: isFirst ? true : s.isInitialLoading,
          isFetchingNext: isFirst ? false : true,
          error: null,
        };
        updateRefsFromState(next);
        return next as State;
      });

      try {
        const res = await apiClient.getTransactions({
          ...query,
          limit,
          offset: nextOffset,
          search: query.search?.trim() ? query.search.trim() : undefined,
          category_ids: query.category_ids?.length ? query.category_ids : undefined,
          account_ids: query.account_ids?.length ? query.account_ids : undefined,
        });

        if (seq !== requestSeq.current) return;

        setState((s) => {
          const merged = isFirst ? res.items : [...s.items, ...res.items];
          const nextState: State = {
            ...s,
            items: merged,
            total: res.pagination.total,
            offset: merged.length,
            limit,
            isInitialLoading: false,
            isFetchingNext: false,
            error: null,
          };

          offsetRef.current = nextState.offset;
          totalRef.current = nextState.total;
          busyRef.current = false;

          return nextState;
        });
      } catch (e) {
        if (seq !== requestSeq.current) return;

        setState((s) => {
          const nextState: State = {
            ...s,
            isInitialLoading: false,
            isFetchingNext: false,
            error: e instanceof Error ? e.message : 'Failed to load transactions',
          };
          busyRef.current = false;
          return nextState;
        });
      }
    },
    [query, limit]
  );

  const resetAndFetchFirst = useCallback(() => {
    requestSeq.current += 1; // invalidate in-flight
    offsetRef.current = 0;
    totalRef.current = 0;
    busyRef.current = true;

    setState({
      items: [],
      total: 0,
      offset: 0,
      limit,
      isInitialLoading: true,
      isFetchingNext: false,
      error: null,
    });

    fetchPage(0);
  }, [fetchPage, limit]);

  const hasNext = state.items.length < state.total;

  const fetchNext = useCallback(() => {
    const offset = offsetRef.current;
    const total = totalRef.current;
    const busy = busyRef.current;

    if (busy) return;
    if (total !== 0 && offset >= total) return;

    fetchPage(offset);
  }, [fetchPage]);

  useEffect(() => {
    resetAndFetchFirst();
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
