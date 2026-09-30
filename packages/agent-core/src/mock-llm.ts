/**
 * Mock LLM adapter — swap this module for a real AI SDK / OpenAI provider in §9.
 */

export type MockToolCall =
  | {
      name: 'showTicket';
      args: {
        title: string;
        venue: string;
        datetime: string;
        code?: string;
        documentId?: string;
        fileUrl?: string;
      };
    }
  | {
      name: 'generateItineraryTimeline';
      args: {
        tripDestination: string;
        days: Array<{
          dayNumber: number;
          date: string;
          theme?: string | null;
          items: Array<{
            id: string;
            dayNumber: number;
            date: string;
            timeSlot: string;
            itemType: string;
            title: string;
            description?: string | null;
            locationName?: string | null;
            documentId?: string | null;
          }>;
        }>;
      };
    };

export interface MockAgentResult {
  text: string;
  tools: MockToolCall[];
  route: 'itinerary' | 'document' | 'curator' | 'general';
}

export interface MockAgentInput {
  message: string;
  operatorId?: string | null;
  userId?: string | null;
}

/** Deterministic mock “LLM” — no network. */
export function mockLlmComplete(message: string): MockAgentResult {
  const lower = message.toLowerCase();

  if (
    lower.includes('ticket') ||
    lower.includes('museum') ||
    lower.includes('louvre') ||
    lower.includes('pass')
  ) {
    return {
      route: 'document',
      text: "Here's your museum pass for tomorrow.",
      tools: [
        {
          name: 'showTicket',
          args: {
            title: 'Louvre Museum Pass',
            venue: 'Musée du Louvre',
            datetime: 'Tomorrow · 10:00',
            code: 'LV-88421',
            documentId: '00000000-0000-4000-8000-000000000033',
            fileUrl: 'http://localhost:3001/uploads/seed-louvre.pdf',
          },
        },
      ],
    };
  }

  if (
    lower.includes('plan') ||
    lower.includes('tomorrow') ||
    lower.includes('itinerary') ||
    lower.includes('timeline')
  ) {
    return {
      route: 'itinerary',
      text: "Tomorrow's plan — here's a timeline card.",
      tools: [
        {
          name: 'generateItineraryTimeline',
          args: {
            tripDestination: 'Paris',
            days: [
              {
                dayNumber: 2,
                date: '2026-10-13',
                theme: 'Art & passages',
                items: [
                  {
                    id: 'tl-3',
                    dayNumber: 2,
                    date: '2026-10-13',
                    timeSlot: '10:00',
                    itemType: 'activity',
                    title: 'Louvre morning visit',
                    locationName: 'Louvre Museum',
                    documentId: '00000000-0000-4000-8000-000000000033',
                  },
                  {
                    id: 'tl-4',
                    dayNumber: 2,
                    date: '2026-10-13',
                    timeSlot: '16:00',
                    itemType: 'hidden_gem',
                    title: 'Covered Passage des Panoramas',
                    locationName: '2nd Arrondissement',
                  },
                  {
                    id: 'tl-5',
                    dayNumber: 2,
                    date: '2026-10-13',
                    timeSlot: '20:00',
                    itemType: 'drink',
                    title: 'Natural wine bar',
                    locationName: 'Septime Cave',
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  }

  if (lower.includes('gem') || lower.includes('hidden') || lower.includes('local')) {
    return {
      route: 'curator',
      text: "From your agency's curated list: Passage des Panoramas is a quiet covered passage nearby.",
      tools: [],
    };
  }

  return {
    route: 'general',
    text: "Ask about your Louvre ticket or tomorrow's plan to see generative UI tools.",
    tools: [],
  };
}
