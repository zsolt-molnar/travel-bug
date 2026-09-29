"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { createTravelerSession, setSession } from "@/lib/auth";
import { SEED_IDS } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("traveler@travelbug.demo");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSession(
      createTravelerSession({
        email: email.trim(),
        name: "Demo Traveler",
        plan: "agency_invite",
        operatorId: SEED_IDS.operator,
      }),
    );
    router.push("/app");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-8 pt-safe">
      <Link href="/" className="font-display text-2xl font-semibold text-primary">
        Travel Bug
      </Link>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Mock login — any password works for the POC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full">
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
