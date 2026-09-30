import type { Database } from '@travel-bug/db';
import { fanOutTripMessageNotifications, tripRecipientUserIds } from './notify';

describe('notify helpers', () => {
  it('tripRecipientUserIds dedupes owner and party', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [{ userId: 'owner' }, { userId: 'party-a' }],
        }),
      }),
    } as unknown as Database;

    const ids = await tripRecipientUserIds(db, 'trip-1', 'owner');
    expect(ids.sort()).toEqual(['owner', 'party-a'].sort());
  });

  it('fanOutTripMessageNotifications inserts one row per recipient', async () => {
    const inserted: unknown[] = [];
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [{ userId: 'u2' }],
        }),
      }),
      insert: () => ({
        values: async (rows: unknown) => {
          inserted.push(rows);
        },
      }),
    } as unknown as Database;

    await fanOutTripMessageNotifications(db, {
      tripId: 'trip-1',
      ownerUserId: 'u1',
      messageId: 'msg-1',
      title: 'Hello',
      body: 'World',
    });

    expect(inserted).toHaveLength(1);
    const rows = inserted[0] as Array<{ userId: string; type: string }>;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.type === 'trip_message')).toBe(true);
    expect(rows.map((r) => r.userId).sort()).toEqual(['u1', 'u2']);
  });
});
