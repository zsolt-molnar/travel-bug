"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEMO_IDENTITIES,
  getAdminRole,
  setAdminRole,
  type AdminRole,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", roles: ["superadmin", "agency_manager", "agency_agent"] as AdminRole[] },
  { href: "/agencies", label: "Agencies", roles: ["superadmin"] as AdminRole[] },
  { href: "/trips", label: "Trips", roles: ["superadmin", "agency_manager", "agency_agent"] as AdminRole[] },
  { href: "/staff", label: "Staff", roles: ["agency_manager"] as AdminRole[] },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<AdminRole>("agency_manager");

  useEffect(() => {
    setRole(getAdminRole());
  }, []);

  function switchRole(next: AdminRole) {
    setAdminRole(next);
    setRole(next);
    router.refresh();
    window.location.reload();
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-64 flex-col border-r border-border bg-card p-4">
        <p className="font-display text-xl font-semibold text-primary">
          Travel Bug Admin
        </p>
        <label className="mt-4 text-xs font-medium text-muted-foreground">
          Viewing as
        </label>
        <select
          className="mt-1 h-10 rounded-lg border border-border bg-background px-2 text-sm"
          value={role}
          onChange={(e) => switchRole(e.target.value as AdminRole)}
        >
          {(Object.keys(DEMO_IDENTITIES) as AdminRole[]).map((r) => (
            <option key={r} value={r}>
              {DEMO_IDENTITIES[r].label}
            </option>
          ))}
        </select>
        <nav className="mt-6 flex flex-col gap-1">
          {links
            .filter((l) => l.roles.includes(role))
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === l.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {l.label}
              </Link>
            ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
