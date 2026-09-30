'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';

export type AttachmentPreview = {
  title: string;
  fileUrl: string;
  docType?: string | null;
};

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url);
}

function guessKind(url: string): 'image' | 'pdf' | 'file' {
  if (isImageUrl(url)) return 'image';
  if (isPdfUrl(url)) return 'pdf';
  // Local uploads without a clear extension — try inline iframe preview
  if (url.includes('/uploads/')) return 'pdf';
  return 'file';
}

function formatDocType(t?: string | null) {
  if (!t) return null;
  return t.replace(/_/g, ' ');
}

export function AttachmentViewer({
  attachment,
  open,
  onClose,
}: {
  attachment: AttachmentPreview | null;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !attachment) return null;

  const kind = guessKind(attachment.fileUrl);
  const typeLabel = formatDocType(attachment.docType);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p id={titleId} className="font-display text-lg font-semibold leading-snug">
              {attachment.title}
            </p>
            {typeLabel ? (
              <p className="mt-1 text-xs capitalize text-muted-foreground">{typeLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-lg leading-none text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-muted/40 p-4">
          {kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.fileUrl}
              alt={attachment.title}
              className="mx-auto max-h-[60vh] w-auto max-w-full rounded-xl object-contain shadow-sm"
            />
          ) : kind === 'pdf' ? (
            <iframe
              title={attachment.title}
              src={attachment.fileUrl}
              className="h-[55vh] w-full rounded-xl border border-border bg-white"
            />
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
              <p className="text-sm font-medium">Preview not available</p>
              <p className="text-xs text-muted-foreground">
                Open the file in a new tab to view it.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
          <a
            href={attachment.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"
          >
            Open original
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function AttachmentViewButton({
  attachment,
  children,
  className,
  autoOpen = false,
}: {
  attachment: AttachmentPreview;
  children?: ReactNode;
  className?: string;
  /** Open viewer once when deep-linked (e.g. vault ?docId=). */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);
  return (
    <>
      <button
        type="button"
        className={
          className ??
          'inline-flex h-9 items-center rounded-lg border border-border bg-secondary px-3 text-sm'
        }
        onClick={() => setOpen(true)}
      >
        {children ?? `View · ${attachment.title}`}
      </button>
      <AttachmentViewer
        attachment={attachment}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
