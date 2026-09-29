"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTravelerSession, setSession } from "@/lib/auth";
import { SEED_IDS, VALID_INVITE_CODES } from "@/lib/types";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPath =
    searchParams.get("path") === "agency" || searchParams.get("code")
      ? "agency"
      : "individual";
  const [tab, setTab] = useState(initialPath);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState(searchParams.get("code") ?? "");
  const [error, setError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const inviteValid = useMemo(
    () =>
      VALID_INVITE_CODES.includes(
        invite.trim().toUpperCase() as (typeof VALID_INVITE_CODES)[number],
      ),
    [invite],
  );

  function finish(plan: "individual_monthly" | "agency_invite") {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSession(
      createTravelerSession({
        email: email.trim(),
        name: name.trim(),
        plan,
        operatorId: SEED_IDS.operator,
      }),
    );
    router.push("/app");
  }

  function onIndividualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setCheckoutOpen(true);
  }

  function onAgencySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!inviteValid) {
      setError("Invalid invite code. Try AGENCY2026 or PARIS-VIP.");
      return;
    }
    finish("agency_invite");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-8 pt-safe">
      <Link href="/" className="font-display text-2xl font-semibold text-primary">
        Travel Bug
      </Link>
      <h1 className="mt-6 font-display text-3xl font-semibold">
        Create your account
      </h1>
      <p className="mt-2 text-muted-foreground">
        Choose individual subscription or an agency invite code.
      </p>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="agency">Agency invite</TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle>Monthly plan</CardTitle>
              <CardDescription>
                $12 / month · cancel anytime · mock Stripe checkout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!checkoutOpen ? (
                <form className="space-y-4" onSubmit={onIndividualSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : null}
                  <Button type="submit" className="w-full">
                    Continue to checkout
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/60 p-4">
                    <p className="text-sm font-medium">Mock Stripe Checkout</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Travel Bug Monthly · $12.00
                    </p>
                    <div className="mt-3 space-y-2">
                      <Input placeholder="4242 4242 4242 4242" disabled />
                      <div className="flex gap-2">
                        <Input placeholder="12 / 28" disabled />
                        <Input placeholder="123" disabled />
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => finish("individual_monthly")}
                  >
                    Pay $12 (mock)
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setCheckoutOpen(false)}
                  >
                    Back
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agency">
          <Card>
            <CardHeader>
              <CardTitle>Agency invite</CardTitle>
              <CardDescription>
                Free pass for your travel period plus 1 month prior.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onAgencySubmit}>
                <div className="space-y-2">
                  <Label htmlFor="aname">Full name</Label>
                  <Input
                    id="aname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aemail">Email</Label>
                  <Input
                    id="aemail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Invite / coupon code</Label>
                  <Input
                    id="code"
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                    placeholder="AGENCY2026"
                    className="uppercase"
                  />
                </div>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <Button type="submit" className="w-full">
                  Activate free pass
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
