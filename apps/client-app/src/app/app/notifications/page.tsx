'use client';

import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

type AppNotification = {
  id: string;
  type: 'trip_message' | 'vault_document' | string;
  title: string;
  body: string;
  tripId: string | null;
  messageId: string | null;
  documentId: string | null;
  readAt: string | null;
  createdAt: string;
};

function hrefFor(n: AppNotification): string | null {
  if (n.type === 'trip_message' && n.tripId) {
    return `/app/trips/detail?tripId=${n.tripId}&panel=board`;
  }
  if (n.type === 'vault_document' && n.documentId) {
    return `/app/vault?docId=${n.documentId}`;
  }
  if (n.tripId) return `/app/trips/detail?tripId=${n.tripId}`;
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR('notifications', () =>
    apiGet<AppNotification[]>('/notifications'),
  );
  const items = data ?? [];

  async function markRead(id: string) {
    await apiPost(`/notifications/${id}/read`, {});
    await Promise.all([mutate(), globalMutate('notifications:unread-count')]);
  }

  async function markAllRead() {
    await apiPost('/notifications/read-all', {});
    await Promise.all([mutate(), globalMutate('notifications:unread-count')]);
  }

  async function onOpen(n: AppNotification) {
    if (!n.readAt) {
      try {
        await markRead(n.id);
      } catch {
        /* still navigate */
      }
    }
    const href = hrefFor(n);
    if (href) router.push(href);
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Trip board messages and new vault documents from your agency.
          </p>
        </div>
        {unread > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void markAllRead()}
          >
            Mark all as read
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load notifications. {error instanceof Error ? error.message : ''}
        </p>
      ) : !items.length ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            You’re all caught up — no notifications yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void onOpen(n)}
                className={cn(
                  'w-full rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary',
                  !n.readAt && 'border-primary/40 bg-primary/5',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="capitalize">
                    {n.type === 'trip_message'
                      ? 'Trip message'
                      : n.type === 'vault_document'
                        ? 'Vault'
                        : n.type}
                  </Badge>
                  {!n.readAt ? (
                    <Badge className="border-transparent bg-primary/15 text-primary">
                      New
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 font-medium leading-snug">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {n.body}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
