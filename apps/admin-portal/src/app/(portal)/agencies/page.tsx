"use client";

import { useState } from "react";
import useSWR from "swr";
import { adminGet, adminPost } from "@/lib/admin-api";

type Agency = { id: string; name: string; brandConfig: unknown };

export default function AgenciesPage() {
  const { data, mutate, error } = useSWR("agencies", () =>
    adminGet<Agency[]>("/agencies"),
  );
  const [name, setName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [msg, setMsg] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminPost("/agencies", { name, managerEmail, managerName });
      setMsg("Agency created");
      setName("");
      setManagerEmail("");
      setManagerName("");
      await mutate();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Agencies</h1>
        <p className="text-muted-foreground">Superadmin only.</p>
        {error ? (
          <p className="mt-2 text-sm text-red-700">
            Switch role to Superadmin to load agencies.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id} className="border-b border-border">
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={onCreate}
        className="max-w-lg space-y-3 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="font-display text-xl font-semibold">Create agency</h2>
        <input
          className="h-11 w-full rounded-xl border border-border px-3"
          placeholder="Agency name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="h-11 w-full rounded-xl border border-border px-3"
          placeholder="Manager name"
          value={managerName}
          onChange={(e) => setManagerName(e.target.value)}
        />
        <input
          className="h-11 w-full rounded-xl border border-border px-3"
          placeholder="Manager email"
          type="email"
          value={managerEmail}
          onChange={(e) => setManagerEmail(e.target.value)}
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Create
        </button>
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </form>
    </div>
  );
}
