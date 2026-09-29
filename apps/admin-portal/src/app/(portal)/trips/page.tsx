"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { adminGet, adminPost } from "@/lib/admin-api";

type Trip = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
};

export default function TripsAdminPage() {
  const { data, mutate } = useSWR("agency-trips", () =>
    adminGet<Trip[]>("/agencies/trips"),
  );
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    await adminPost("/agencies/trips", { destination, startDate, endDate });
    setDestination("");
    setStartDate("");
    setEndDate("");
    await mutate();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Trips</h1>
        <p className="text-muted-foreground">Agency trip manager.</p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid max-w-2xl gap-3 rounded-2xl border border-border bg-card p-6 md:grid-cols-4"
      >
        <input
          className="h-11 rounded-xl border border-border px-3 md:col-span-2"
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <input
          className="h-11 rounded-xl border border-border px-3"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          className="h-11 rounded-xl border border-border px-3"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground md:col-span-4"
        >
          Create trip
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((t) => (
              <tr key={t.id} className="border-b border-border">
                <td className="px-4 py-3 font-medium">{t.destination}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {t.startDate} → {t.endDate}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/trips/${t.id}`}
                    className="text-primary underline"
                  >
                    Manage clients
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
