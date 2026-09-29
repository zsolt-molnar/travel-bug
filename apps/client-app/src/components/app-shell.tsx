"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Map,
  FolderLock,
  MessageCircle,
} from "lucide-react";
import { getSession, clearSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/app", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/app/trips", label: "Trips", icon: Map },
  { href: "/app/vault", label: "Vault", icon: FolderLock },
  { href: "/app/chat", label: "Chat", icon: MessageCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session);
    setReady(true);
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="phone-frame flex items-center justify-center p-8 text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="phone-frame flex flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 pt-safe py-3">
        <div>
          <p className="font-display text-lg font-semibold text-primary">
            Travel Bug
          </p>
          <p className="text-xs text-muted-foreground">{user.name}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearSession();
            router.push("/");
          }}
        >
          Log out
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">{children}</main>

      <nav
        className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur pb-safe"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <ul className="grid grid-cols-4 gap-1 px-2 pt-2">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium",
                    active
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
