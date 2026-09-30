import { Suspense } from 'react';
import VaultClient from './vault-client';

export default function VaultPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading vault…</p>}>
      <VaultClient />
    </Suspense>
  );
}
