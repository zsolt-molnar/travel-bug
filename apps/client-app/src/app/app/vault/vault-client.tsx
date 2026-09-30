'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiDelete, apiGet, API_URL, authHeaders } from '@/lib/api';
import { AttachmentViewButton } from '@/components/attachment-viewer';
import type { DocCategory, Trip, VaultDocument } from '@/lib/types';
import { cn } from '@/lib/utils';

const categories: DocCategory[] = [
  'passport',
  'insurance',
  'visa',
  'flight',
  'train',
  'museum_event',
  'ticket',
  'other',
];

type ApiDoc = {
  id: string;
  userId: string;
  tripId: string;
  docType: string;
  title: string | null;
  fileUrl: string;
};

export default function VaultClient() {
  const searchParams = useSearchParams();
  const highlightDocId = searchParams.get('docId')?.trim() ?? '';

  const { data: trips, error: tripsError } = useSWR('trips', () =>
    apiGet<Trip[]>('/trips'),
  );
  const { data, error, isLoading, mutate } = useSWR('vault', async () => {
    const rows = await apiGet<ApiDoc[]>('/vault/documents');
    return rows.map((d): VaultDocument => ({
      id: d.id,
      userId: d.userId,
      tripId: d.tripId,
      docType: d.docType as DocCategory,
      title: d.title ?? 'Document',
      fileUrl: d.fileUrl,
    }));
  });
  const docs = data ?? [];
  const [filterTrip, setFilterTrip] = useState<string>('all');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [uploadTripId, setUploadTripId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocCategory>('ticket');
  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const effectiveUploadTrip = uploadTripId || trips?.[0]?.id || '';

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        if (filterTrip !== 'all' && d.tripId !== filterTrip) return false;
        if (filterCat !== 'all' && d.docType !== filterCat) return false;
        return true;
      }),
    [docs, filterTrip, filterCat],
  );

  useEffect(() => {
    if (!highlightDocId || !docs.length) return;
    const el = document.getElementById(`vault-doc-${highlightDocId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightDocId, docs.length]);

  async function onDelete(doc: VaultDocument) {
    if (!confirm(`Delete “${doc.title}”?`)) return;
    setUploadError('');
    setDeletingId(doc.id);
    try {
      await apiDelete(`/vault/documents/${doc.id}`);
      await mutate();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not delete.');
    } finally {
      setDeletingId(null);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setUploadError('');
    setUploadMsg('');
    if (!effectiveUploadTrip) {
      setUploadError('Create a trip before uploading documents.');
      return;
    }
    if (!vaultFile) {
      setUploadError('Choose a file to upload.');
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.append('file', vaultFile);
    form.append('tripId', effectiveUploadTrip);
    form.append('docType', docType);
    form.append('title', title.trim() || vaultFile.name);
    try {
      const res = await fetch(`${API_URL}/vault/documents`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const msg = Array.isArray(body?.message)
          ? body.message.join(', ')
          : body?.message;
        throw new Error(msg || `Upload failed: ${res.status}`);
      }
      await mutate();
      setTitle('');
      setVaultFile(null);
      setUploadMsg('Document saved');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Vault</h1>
        <p className="text-sm text-muted-foreground">
          Passports, visas, insurance, and tickets.
        </p>
      </div>

      <form
        onSubmit={(e) => void onSave(e)}
        className="space-y-3 rounded-2xl border border-dashed border-border bg-card p-5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) setVaultFile(f);
        }}
      >
        <p className="text-sm font-medium">Upload</p>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Louvre Ticket"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trip">Trip</Label>
          <select
            id="trip"
            className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
            value={effectiveUploadTrip}
            onChange={(e) => setUploadTripId(e.target.value)}
          >
            {(trips ?? []).length === 0 ? (
              <option value="">No trips</option>
            ) : (
              (trips ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title || t.destination}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat">Category</Label>
          <select
            id="cat"
            className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm capitalize"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocCategory)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl bg-muted/60 px-4 text-center text-sm text-muted-foreground">
          {vaultFile ? vaultFile.name : 'Drag & drop (web) or tap to pick file / photo'}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              setVaultFile(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </label>
        <Button type="submit" className="w-full" disabled={busy || !effectiveUploadTrip}>
          {busy ? 'Saving…' : 'Save document'}
        </Button>
        {uploadMsg ? <p className="text-sm text-muted-foreground">{uploadMsg}</p> : null}
        {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
        {tripsError ? (
          <p className="text-sm text-destructive">Could not load trips for upload.</p>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
          value={filterTrip}
          onChange={(e) => setFilterTrip(e.target.value)}
        >
          <option value="all">All trips</option>
          {(trips ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.title || t.destination}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">
          Could not load vault. {error instanceof Error ? error.message : ''}
        </p>
      ) : null}
      {!isLoading && !error && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      ) : null}

      <div className="grid gap-3">
        {filtered.map((doc) => (
          <Card
            key={doc.id}
            id={`vault-doc-${doc.id}`}
            className={cn(
              highlightDocId === doc.id && 'ring-2 ring-primary/50 ring-offset-2',
            )}
          >
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{doc.title}</p>
                <Badge className="mt-1 capitalize">
                  {doc.docType.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <AttachmentViewButton
                  attachment={{
                    title: doc.title,
                    fileUrl: doc.fileUrl,
                    docType: doc.docType,
                  }}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm"
                  autoOpen={highlightDocId === doc.id}
                >
                  View
                </AttachmentViewButton>
                <button
                  type="button"
                  className="text-sm text-destructive underline disabled:opacity-40"
                  disabled={deletingId === doc.id}
                  onClick={() => void onDelete(doc)}
                >
                  {deletingId === doc.id ? '…' : 'Delete'}
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
