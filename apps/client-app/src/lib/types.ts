/** Shared domain contracts — keep in sync with Nest DTOs / agent tool names. */

export type UserRole =
  | "superadmin"
  | "agency_manager"
  | "agency_agent"
  | "traveler";

export type PlanType = "individual_monthly" | "agency_invite" | "none";

export type DocCategory =
  | "passport"
  | "insurance"
  | "visa"
  | "flight"
  | "train"
  | "museum_event";

export type TimelineItemType = "activity" | "eat" | "drink" | "hidden_gem";

/** Tool names yielded by mock LangGraph (Phase 3) and hardcoded chat (Phase 2). */
export const TOOL_SHOW_TICKET = "showTicket" as const;
export const TOOL_GENERATE_ITINERARY_TIMELINE =
  "generateItineraryTimeline" as const;

export type ToolName =
  | typeof TOOL_SHOW_TICKET
  | typeof TOOL_GENERATE_ITINERARY_TIMELINE;

export interface SessionUser {
  userId: string;
  operatorId: string | null;
  email: string;
  name: string;
  role: UserRole;
  plan: PlanType;
}

export interface Trip {
  id: string;
  userId: string;
  operatorId?: string | null;
  destination: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
}

export interface VaultDocument {
  id: string;
  userId: string;
  tripId: string;
  docType: DocCategory;
  title: string;
  fileUrl: string;
  createdAt?: string;
}

export interface TimelineItem {
  id: string;
  dayNumber: number;
  date: string;
  timeSlot: string;
  itemType: TimelineItemType;
  title: string;
  description?: string | null;
  locationName?: string | null;
  documentId?: string | null;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  theme?: string | null;
  items: TimelineItem[];
}

export interface TicketCardPayload {
  title: string;
  venue: string;
  datetime: string;
  code?: string;
  documentId?: string;
}

export interface TimelineCardPayload {
  tripDestination: string;
  days: ItineraryDay[];
}

export const VALID_INVITE_CODES = ["AGENCY2026", "PARIS-VIP"] as const;

export const SEED_IDS = {
  operator: "00000000-0000-4000-8000-000000000001",
  traveler: "00000000-0000-4000-8000-000000000010",
  trip: "00000000-0000-4000-8000-000000000020",
} as const;
