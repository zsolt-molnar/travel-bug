"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, API_URL, apiHeaders } from "@/lib/api";
import { mockDocuments, mockTrips } from "@/lib/mock/data";
import type { DocCategory, VaultDocument } from "@/lib/types";
import { SEED_IDS } from "@/lib/types";

const categories: DocCategory[] = [
  "passport",
  "insurance",
  "visa",
  "flight",
  "train",
  "museum_event",
];

type ApiDoc = {
  id: string;
  userId: string;
  tripId: string;
  docType: string;
  title: string | null;
  fileUrl: string;
};

export default function VaultPage() {
  const { data, mutate } = useSWR(
    "vault",
    async () => {
      const rows = await apiGet<ApiDoc[]>("/vault/documents");
      return rows.map(
        (d): VaultDocument => ({
          id: d.id,
          userId: d.userId,
          tripId: d.tripId,
          docType: d.docType as DocCategory,
          title: d.title ?? "Document",
          fileUrl: d.fileUrl,
        }),
      );
    },
    { fallbackData: mockDocuments, shouldRetryOnError: false },
  );
  const docs = data ?? mockDocuments;
  const [filterTrip, setFilterTrip] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocCategory>("museum_event");

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        if (filterTrip !== "all" && d.tripId !== filterTrip) return false;
        if (filterCat !== "all" && d.docType !== filterCat) return false;
        return true;
      }),
    [docs, filterTrip, filterCat],
  );

  async function onFile(files: FileList | null) {
    if (!files?.[0]) return;
    const file = files[0];
    const form = new FormData();
    form.append("file", file);
    form.append("tripId", SEED_IDS.trip);
    form.append("docType", docType);
    form.append("title", title || file.name);
    try {
      const headers = apiHeaders() as Record<string, string>;
      delete headers["Content-Type"];
      await fetch(`${API_URL}/vault/documents`, {
        method: "POST",
        headers,
        body: form,
      });
      await mutate();
    } catch {
      /* keep mock usable */
    }
    setTitle("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Vault</h1>
        <p className="text-sm text-muted-foreground">
          Passports, visas, insurance, and tickets.
        </p>
      </div>

      <Card
        className="border-dashed"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onFile(e.dataTransfer.files);
        }}
      >
        <CardHeader>
          <CardTitle className="text-base">Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
            <Label htmlFor="cat">Category</Label>
            <select
              id="cat"
              className="flex h-11 w-full rounded-xl border border-border bg-card px-3"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocCategory)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl bg-muted/60 px-4 text-center text-sm text-muted-foreground">
            Drag & drop (web) or tap to pick file / photo
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => void onFile(e.target.files)}
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
          value={filterTrip}
          onChange={(e) => setFilterTrip(e.target.value)}
        >
          <option value="all">All trips</option>
          {mockTrips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.destination}
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
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3">
        {filtered.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{doc.title}</p>
                <Badge className="mt-1 capitalize">{doc.docType}</Badge>
              </div>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm"
              >
                Preview
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
