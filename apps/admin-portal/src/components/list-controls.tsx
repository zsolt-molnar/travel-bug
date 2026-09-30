'use client';

import { PAGE_SIZE_OPTIONS } from '@/lib/use-list-query';

type ListControlsProps = {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  from: number;
  to: number;
  total: number;
  filters?: React.ReactNode;
};

export function ListControls({
  search,
  onSearchChange,
  placeholder = 'Search…',
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  from,
  to,
  total,
  filters,
}: ListControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <input
          className="h-10 w-full max-w-xs rounded-xl border border-border bg-background px-3 text-sm"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {filters}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <label className="flex items-center gap-2">
          <span>Per page</span>
          <select
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span>{total === 0 ? '0 results' : `${from}–${to} of ${total}`}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-9 rounded-lg border border-border px-3 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          <span className="px-1 tabular-nums">
            {page}/{pageCount}
          </span>
          <button
            type="button"
            className="h-9 rounded-lg border border-border px-3 disabled:opacity-40"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
