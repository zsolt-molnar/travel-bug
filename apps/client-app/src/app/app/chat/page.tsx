"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TicketCard,
  TimelineCard,
} from "@/components/generative/cards";
import {
  TOOL_GENERATE_ITINERARY_TIMELINE,
  TOOL_SHOW_TICKET,
  type TicketCardPayload,
  type TimelineCardPayload,
} from "@/lib/types";
import { API_URL, apiHeaders } from "@/lib/api";
import { cn } from "@/lib/utils";
import { mockTimeline } from "@/lib/mock/data";

const fallbackTicket: TicketCardPayload = {
  title: "Louvre Museum Pass",
  venue: "Musée du Louvre",
  datetime: "Tomorrow · 10:00",
  code: "LV-88421",
  documentId: "00000000-0000-4000-8000-000000000033",
};

const fallbackTimeline: TimelineCardPayload = {
  tripDestination: "Paris",
  days: [
    {
      dayNumber: 2,
      date: "2026-10-13",
      theme: "Art & passages",
      items: mockTimeline.filter((i) => i.dayNumber === 2),
    },
  ],
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/chat`,
        headers: () => apiHeaders() as Record<string, string>,
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col">
      <div>
        <h1 className="font-display text-2xl font-semibold">Chat</h1>
        <p className="text-sm text-muted-foreground">
          Streamed via Nest + MockLLM · {status}
        </p>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Try “Show my museum ticket for tomorrow” or “What’s the plan?”
          </p>
        ) : null}
        {messages.map((m) => {
          const text = m.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") ?? "";

          const toolParts = m.parts?.filter(
            (p) =>
              typeof p.type === "string" &&
              (p.type.startsWith("tool-") || p.type === "dynamic-tool"),
          ) ?? [];

          return (
            <div
              key={m.id}
              className={cn(
                "max-w-[92%] rounded-2xl px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "border border-border bg-card",
              )}
            >
              {text ? <p>{text}</p> : null}
              {toolParts.map((part, idx) => {
                const name =
                  "toolName" in part
                    ? String(part.toolName)
                    : part.type.replace(/^tool-/, "");
                const output =
                  "output" in part
                    ? part.output
                    : "input" in part
                      ? part.input
                      : null;
                if (name === TOOL_SHOW_TICKET) {
                  return (
                    <div key={idx} className="mt-3">
                      <TicketCard
                        payload={
                          (output as TicketCardPayload) ?? fallbackTicket
                        }
                      />
                    </div>
                  );
                }
                if (name === TOOL_GENERATE_ITINERARY_TIMELINE) {
                  return (
                    <div key={idx} className="mt-3">
                      <TimelineCard
                        payload={
                          (output as TimelineCardPayload) ?? fallbackTimeline
                        }
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
        {error ? (
          <p className="text-sm text-destructive">
            Chat stream error — is the API running on :3001? ({error.message})
          </p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-border pt-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Show my museum ticket for tomorrow"
          className="flex-1"
        />
        <Button type="submit" disabled={status === "streaming"}>
          Send
        </Button>
      </form>
    </div>
  );
}
