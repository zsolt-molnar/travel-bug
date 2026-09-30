'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { adminDelete, adminGet, adminPatch, adminUpload } from '@/lib/admin-api';
import { AttachmentViewButton } from '@/components/attachment-viewer';

type Traveler = {
  id: string;
  email: string;
  name: string | null;
  isOwner?: boolean;
  docCount?: number;
  tripId: string;
  independent?: boolean;
};

type TripRow = {
  id: string;
  title: string;
  destination: string;
};

type VaultDoc = {
  id: string;
  userId: string;
  tripId: string;
  docType: string;
  title: string | null;
  fileUrl: string;
};

const DOC_TYPES = [
  'passport',
  'insurance',
  'visa',
  'flight',
  'train',
  'museum_event',
  'ticket',
  'other',
] as const;

export default function TripTravelerDetailPage() {
  const params = useParams();
  const tripId = String(params.tripId);
  const userId = String(params.userId);

  const { data: traveler, error: travelerError } = useSWR(
    `trip-client:${tripId}:${userId}`,
    () => adminGet<Traveler>(`/agencies/trips/${tripId}/clients/${userId}`),
  );
  const { data: trip } = useSWR(`trip:${tripId}`, () =>
    adminGet<TripRow>(`/agencies/trips/${tripId}`),
  );
  const {
    data: vaultDocs = [],
    mutate: mutateVault,
    error: vaultError,
  } = useSWR(`vault:${tripId}:${userId}`, () =>
    adminGet<VaultDoc[]>(`/vault/documents?tripId=${tripId}&userId=${userId}`),
  );

  const [vaultDocType, setVaultDocType] = useState<(typeof DOC_TYPES)[number]>('flight');
  const [vaultTitle, setVaultTitle] = useState('');
  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [vaultMsg, setVaultMsg] = useState('');
  const [vaultBusy, setVaultBusy] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocType, setEditDocType] = useState<(typeof DOC_TYPES)[number]>('other');

  async function uploadVaultDoc(e: React.FormEvent) {
    e.preventDefault();
    setVaultMsg('');
    if (!vaultFile) {
      setVaultMsg('Choose a file to upload.');
      return;
    }
    setVaultBusy(true);
    try {
      const form = new FormData();
      form.append('file', vaultFile);
      form.append('tripId', tripId);
      form.append('userId', userId);
      form.append('docType', vaultDocType);
      form.append('title', vaultTitle.trim() || vaultFile.name);
      await adminUpload('/vault/documents', form);
      setVaultTitle('');
      setVaultFile(null);
      setVaultMsg('Document saved to traveler vault');
      await mutateVault();
    } catch (err) {
      setVaultMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setVaultBusy(false);
    }
  }

  function startEditDoc(doc: VaultDoc) {
    setEditingDocId(doc.id);
    setEditDocTitle(doc.title ?? '');
    setEditDocType(
      (DOC_TYPES.includes(doc.docType as (typeof DOC_TYPES)[number])
        ? doc.docType
        : 'other') as (typeof DOC_TYPES)[number],
    );
    setVaultMsg('');
  }

  async function saveEditDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDocId) return;
    setVaultBusy(true);
    setVaultMsg('');
    try {
      await adminPatch(`/vault/documents/${editingDocId}`, {
        title: editDocTitle.trim() || 'Document',
        docType: editDocType,
      });
      setEditingDocId(null);
      setVaultMsg('Document updated');
      await mutateVault();
    } catch (err) {
      setVaultMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setVaultBusy(false);
    }
  }

  async function deleteVaultDoc(docId: string) {
    if (!confirm('Delete this vault document?')) return;
    setVaultBusy(true);
    setVaultMsg('');
    try {
      await adminDelete(`/vault/documents/${docId}`);
      if (editingDocId === docId) setEditingDocId(null);
      setVaultMsg('Document deleted');
      await mutateVault();
    } catch (err) {
      setVaultMsg(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setVaultBusy(false);
    }
  }

  if (travelerError) {
    return (
      <div className="space-y-4">
        <Link href={`/trips/${tripId}`} className="text-sm text-primary underline">
          ← Back to trip
        </Link>
        <p className="text-sm text-red-700">
          Could not load traveler.{' '}
          {travelerError instanceof Error ? travelerError.message : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/trips/${tripId}`} className="text-sm text-primary underline">
          ← Back to trip
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          {traveler?.name ?? 'Traveler'}
        </h1>
        <p className="text-muted-foreground">
          {traveler?.email ?? '…'}
          {traveler?.isOwner ? ' · Owner' : ''}
          {trip ? ` · ${trip.title || trip.destination}` : null}
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Vault</h2>
          <p className="text-sm text-muted-foreground">
            Documents the agency adds for this traveler on this trip (tickets, insurance,
            etc.).
          </p>
        </div>

        <form
          onSubmit={(e) => void uploadVaultDoc(e)}
          className="max-w-xl space-y-3 rounded-2xl border border-dashed border-border bg-card p-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) setVaultFile(f);
          }}
        >
          <p className="text-sm font-medium">Upload</p>
          <label className="block text-sm">
            Document type
            <select
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm capitalize"
              value={vaultDocType}
              onChange={(e) =>
                setVaultDocType(e.target.value as (typeof DOC_TYPES)[number])
              }
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Title (optional)
            <input
              className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm"
              value={vaultTitle}
              onChange={(e) => setVaultTitle(e.target.value)}
              placeholder="e.g. Louvre entry"
            />
          </label>
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl bg-muted/60 px-4 text-center text-sm text-muted-foreground">
            {vaultFile ? vaultFile.name : 'Drag & drop or click to pick file / photo'}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={vaultBusy}
              onChange={(e) => {
                setVaultFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="submit"
            disabled={vaultBusy}
            className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {vaultBusy ? 'Saving…' : 'Save document'}
          </button>
          {vaultMsg ? <p className="text-sm text-muted-foreground">{vaultMsg}</p> : null}
        </form>

        {vaultError ? (
          <p className="text-sm text-red-700">
            Could not load vault. {vaultError instanceof Error ? vaultError.message : ''}
          </p>
        ) : null}

        <ul className="space-y-2">
          {vaultDocs.map((doc) => {
            if (editingDocId === doc.id) {
              return (
                <li
                  key={doc.id}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <form onSubmit={(e) => void saveEditDoc(e)} className="space-y-2">
                    <input
                      className="h-9 w-full rounded-lg border border-border px-2 text-sm"
                      value={editDocTitle}
                      onChange={(e) => setEditDocTitle(e.target.value)}
                      placeholder="Title"
                      required
                    />
                    <select
                      className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm capitalize"
                      value={editDocType}
                      onChange={(e) =>
                        setEditDocType(e.target.value as (typeof DOC_TYPES)[number])
                      }
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <button
                        type="submit"
                        disabled={vaultBusy}
                        className="text-primary underline disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground underline"
                        onClick={() => setEditingDocId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </li>
              );
            }
            return (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{doc.title ?? 'Document'}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {doc.docType.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <AttachmentViewButton
                    attachment={{
                      title: doc.title ?? 'Document',
                      fileUrl: doc.fileUrl,
                      docType: doc.docType,
                    }}
                  >
                    View
                  </AttachmentViewButton>
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => startEditDoc(doc)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-700 underline"
                    disabled={vaultBusy}
                    onClick={() => void deleteVaultDoc(doc.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
          {!vaultDocs.length ? (
            <li className="text-sm text-muted-foreground">
              No vault documents for this traveler yet.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
