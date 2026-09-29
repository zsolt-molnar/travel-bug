"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { adminGet, adminPost } from "@/lib/admin-api";

const CLIENT_APP =
  process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3000";

export default function TripClientsPage() {
  const params = useParams();
  const tripId = String(params.tripId);
  const { data, mutate } = useSWR(`clients:${tripId}`, () =>
    adminGet<{
      registered: Array<{ id: string; email: string; name: string | null }>;
      pending: Array<{ id: string; email: string; code: string; status: string }>;
    }>(`/agencies/trips/${tripId}/clients`),
  );
  const [email, setEmail] = useState("");
  const [lastInvite, setLastInvite] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminPost<{
      status: string;
      invite?: { code: string };
      inviteLink?: string;
    }>(`/agencies/trips/${tripId}/clients`, { email });
    if (res.inviteLink) {
      setLastInvite(`${CLIENT_APP}${res.inviteLink}`);
    } else {
      setLastInvite(null);
    }
    setEmail("");
    await mutate();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Trip clients</h1>
        <p className="font-mono text-xs text-muted-foreground">{tripId}</p>
      </div>

      <form onSubmit={onAdd} className="flex max-w-lg gap-2">
        <input
          className="h-11 flex-1 rounded-xl border border-border px-3"
          type="email"
          placeholder="client@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Add traveler
        </button>
      </form>
      {lastInvite ? (
        <div className="rounded-xl border border-accent/40 bg-card p-4 text-sm">
          <p className="font-medium">Pending invite link</p>
          <p className="mt-1 break-all font-mono text-xs">{lastInvite}</p>
          <button
            type="button"
            className="mt-2 text-primary underline"
            onClick={() => navigator.clipboard.writeText(lastInvite)}
          >
            Copy invite link
          </button>
        </div>
      ) : null}

      <section>
        <h2 className="font-semibold">Registered</h2>
        <ul className="mt-2 space-y-2">
          {(data?.registered ?? []).map((u) => (
            <li
              key={u.id}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              {u.name ?? "Traveler"} · {u.email}{" "}
              <span className="text-muted-foreground">(Registered)</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Pending invites</h2>
        <ul className="mt-2 space-y-2">
          {(data?.pending ?? []).map((inv) => {
            const link = `${CLIENT_APP}/register?code=${inv.code}`;
            return (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"
              >
                <span>
                  {inv.email} · code <code>{inv.code}</code>{" "}
                  <span className="text-muted-foreground">(Pending Invite)</span>
                </span>
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => navigator.clipboard.writeText(link)}
                >
                  Copy invite link
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
