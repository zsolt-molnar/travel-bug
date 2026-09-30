'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin, isAuthenticated } from '@/lib/admin-api';

const DEMO_ACCOUNTS = [
  { email: 'manager@wanderlust.pro', label: 'Agency Manager' },
  { email: 'agent@wanderlust.pro', label: 'Agency Agent' },
  { email: 'superadmin@travelbug.demo', label: 'Superadmin' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('manager@wanderlust.pro');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/');
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div>
          <p className="font-display text-2xl font-semibold text-primary">
            Travel Bug Admin
          </p>
          <h1 className="mt-2 font-display text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your agency credentials to manage trips, gems, and staff.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-1 h-11 w-full rounded-xl border border-border px-3"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1 h-11 w-full rounded-xl border border-border px-3"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p className="mt-1">Password for all: password123</p>
          <ul className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="text-left text-primary underline"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword('password123');
                  }}
                >
                  {a.label}
                </button>
                <span className="ml-1 font-mono">· {a.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
