/** Shared domain contracts — keep in sync with Nest DTOs / agent tool names. */

export type UserRole = 'superadmin' | 'agency_manager' | 'agency_agent' | 'traveler';

export type PlanType = 'individual_monthly' | 'agency_invite' | 'none';

export type DocCategory =
  | 'passport'
  | 'insurance'
  | 'visa'
  | 'flight'
  | 'train'
  | 'museum_event'
  | 'ticket'
  | 'other';

export type TimelineItemType =
  'activity' | 'eat' | 'drink' | 'transit' | 'hidden_gem' | 'other';

/** Tool names yielded by mock LangGraph (Phase 3) and hardcoded chat (Phase 2). */
export const TOOL_SHOW_TICKET = 'showTicket' as const;
export const TOOL_GENERATE_ITINERARY_TIMELINE = 'generateItineraryTimeline' as const;

export type ToolName = typeof TOOL_SHOW_TICKET | typeof TOOL_GENERATE_ITINERARY_TIMELINE;

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  operatorId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface SessionUser {
  accessToken: string;
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
  title?: string;
  destination: string;
  destinationPlaceId?: string | null;
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
  timeSlot: string | null;
  itemType: TimelineItemType | string;
  title: string;
  description?: string | null;
  locationName?: string | null;
  gemId?: string | null;
  documentId?: string | null;
  sortOrder?: number | null;
}

export interface ItineraryDay {
  id?: string;
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
  fileUrl?: string;
}

export interface TimelineCardPayload {
  tripDestination: string;
  days: ItineraryDay[];
}

/** Stable seed IDs used for static export params / demos. */
export const SEED_IDS = {
  operator: '00000000-0000-4000-8000-000000000001',
  travelerIndependent: '00000000-0000-4000-8000-000000000014',
  trip: '00000000-0000-4000-8000-000000000020',
} as const;
