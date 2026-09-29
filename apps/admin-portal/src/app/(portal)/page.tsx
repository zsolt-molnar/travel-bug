"use client";

import useSWR from "swr";
import { adminGet } from "@/lib/admin-api";

export default function AdminDashboard() {
  const { data: trips } = useSWR("agency-trips", () =>
    adminGet<Array<{ id: string; destination: string }>>("/agencies/trips"),
  );
  const { data: staff } = useSWR("agency-staff", () =>
    adminGet<Array<{ id: string }>>("/agencies/staff").catch(() => []),
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Overview of active trips and team (POC).
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Active trips</p>
          <p className="mt-2 font-display text-4xl font-semibold">
            {trips?.length ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Staff / clients users</p>
          <p className="mt-2 font-display text-4xl font-semibold">
            {staff?.length ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
