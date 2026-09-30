import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional().default(''),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function parsePagination(raw: Record<string, unknown>): PaginationQuery {
  return paginationQuerySchema.parse(raw);
}

export function pageResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PageResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function pageOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}
