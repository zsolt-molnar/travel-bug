"use client";

import { useState } from "react";
import useSWR from "swr";
import { adminGet, adminPost } from "@/lib/admin-api";

export default function StaffPage() {
  const { data, mutate, error } = useSWR("staff", () =>
    adminGet<
      Array<{ id: string; email: string; name: string | null; role: string }>
    >("/agencies/staff"),
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    await adminPost("/agencies/staff", { email, name });
    setEmail("");
    setName("");
    await mutate();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Staff</h1>
        <p className="text-muted-foreground">
          Managers can invite agency agents.
        </p>
        {error ? (
          <p className="mt-2 text-sm text-red-700">
            Staff management requires Agency Manager role.
          </p>
        ) : null}
      </div>

      <form
        onSubmit={onInvite}
        className="grid max-w-lg gap-3 rounded-2xl border border-border bg-card p-6"
      >
        <input
          className="h-11 rounded-xl border border-border px-3"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="h-11 rounded-xl border border-border px-3"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Invite agent
        </button>
      </form>

      <ul className="space-y-2">
        {(data ?? []).map((u) => (
          <li
            key={u.id}
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
          >
            {u.name} · {u.email} · <span className="capitalize">{u.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
