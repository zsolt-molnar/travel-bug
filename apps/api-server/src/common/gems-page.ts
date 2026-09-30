import {
  and,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  type SQL,
} from 'drizzle-orm';
import { hiddenGems, type Database } from '@travel-bug/db';
import { gemVisibilitySql, placeSubtreeIds } from '../auth/acl';
import { pageOffset, pageResult, type PageResult } from './pagination';

export async function listGemsForScopePaged(
  db: Database,
  opts: {
    placeId: string;
    operatorId?: string | null;
    allOperators?: boolean;
    category?: string;
    scope?: 'platform' | 'agency';
    search?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<PageResult<typeof hiddenGems.$inferSelect>> {
  const placeIds = await placeSubtreeIds(db, opts.placeId);
  const conditions: SQL[] = [inArray(hiddenGems.placeId, placeIds)];
  if (!opts.allOperators) {
    conditions.push(gemVisibilitySql(opts.operatorId ?? null));
  }
  if (opts.category) {
    conditions.push(eq(hiddenGems.category, opts.category));
  }
  if (opts.scope === 'platform') {
    conditions.push(isNull(hiddenGems.operatorId));
  } else if (opts.scope === 'agency') {
    conditions.push(isNotNull(hiddenGems.operatorId));
  }
  const q = opts.search?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(hiddenGems.title, pattern),
        ilike(hiddenGems.description, pattern),
        ilike(hiddenGems.category, pattern),
        ilike(hiddenGems.neighborhood, pattern),
      )!,
    );
  }

  const where = and(...conditions);
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 10;

  const [totalRow] = await db.select({ value: count() }).from(hiddenGems).where(where);
  const items = await db
    .select()
    .from(hiddenGems)
    .where(where)
    .orderBy(hiddenGems.title)
    .limit(pageSize)
    .offset(pageOffset(page, pageSize));

  return pageResult(items, Number(totalRow?.value ?? 0), page, pageSize);
}
