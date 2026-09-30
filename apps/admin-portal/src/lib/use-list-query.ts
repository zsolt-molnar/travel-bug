'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * Server-side list pagination + debounced search.
 * `pathBuilder` receives page/pageSize/search (+ optional filters) and returns API path.
 */
export function useServerList<T>(
  key: string,
  fetcher: (query: string) => Promise<PageResult<T>>,
  opts?: {
    defaultPageSize?: number;
    /** Extra filter fields included in the request (e.g. role, category) */
    filters?: Record<string, string | undefined>;
    debounceMs?: number;
    enabled?: boolean;
  },
) {
  const defaultPageSize = opts?.defaultPageSize ?? 10;
  const debounceMs = opts?.debounceMs ?? 300;
  const enabled = opts?.enabled ?? true;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch((prev) => {
        const next = searchInput.trim();
        if (prev !== next) setPage(1);
        return next;
      });
    }, debounceMs);
    return () => clearTimeout(t);
  }, [searchInput, debounceMs]);

  const filterKey = useMemo(() => JSON.stringify(opts?.filters ?? {}), [opts?.filters]);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const query = useMemo(() => {
    const filters = opts?.filters ?? {};
    return buildQuery({
      page,
      pageSize,
      search: search || undefined,
      ...filters,
    });
  }, [page, pageSize, search, filterKey, opts?.filters]);

  const swrKey = enabled ? `${key}${query}` : null;
  const { data, error, isLoading, mutate } = useSWR(swrKey, () => fetcher(query));

  const setSearchDebounced = useCallback((next: string) => {
    setSearchInput(next);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const total = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 1;
  const safePage = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return {
    search: searchInput,
    setSearch: setSearchDebounced,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageItems: data?.items ?? [],
    total,
    pageCount,
    from,
    to,
    error,
    isLoading,
    mutate,
    /** Full API payload (PageResult + optional extras like pending). */
    data,
  };
}

export function pageFetcher<T>(get: <R>(path: string) => Promise<R>, basePath: string) {
  return (query: string) => get<PageResult<T>>(`${basePath}${query}`);
}
