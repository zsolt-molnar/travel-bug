import { eq } from 'drizzle-orm';
import { notifications, tripTravelers, type Database } from '@travel-bug/db';

/** Owner + party travelers for a trip (deduped). */
export async function tripRecipientUserIds(
  db: Database,
  tripId: string,
  ownerUserId: string,
): Promise<string[]> {
  const party = await db
    .select({ userId: tripTravelers.userId })
    .from(tripTravelers)
    .where(eq(tripTravelers.tripId, tripId));
  return [...new Set([ownerUserId, ...party.map((p) => p.userId)])];
}

export async function fanOutTripMessageNotifications(
  db: Database,
  opts: {
    tripId: string;
    ownerUserId: string;
    messageId: string;
    title: string;
    body: string;
  },
) {
  const userIds = await tripRecipientUserIds(db, opts.tripId, opts.ownerUserId);
  if (!userIds.length) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: 'trip_message' as const,
      title: opts.title,
      body: opts.body,
      tripId: opts.tripId,
      messageId: opts.messageId,
    })),
  );
}

export async function notifyVaultDocument(
  db: Database,
  opts: {
    userId: string;
    tripId: string;
    documentId: string;
    title: string;
  },
) {
  await db.insert(notifications).values({
    userId: opts.userId,
    type: 'vault_document',
    title: 'New vault document',
    body: `${opts.title} was added to your trip vault.`,
    tripId: opts.tripId,
    documentId: opts.documentId,
  });
}
