import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  itineraries,
  itineraryDays,
  itineraryItems,
} from '@travel-bug/db';
import { DbService } from '../../db/db.service';
import {
  Identity,
  IdentityGuard,
  type RequestIdentity,
} from '../../auth/identity';

@Controller('itinerary')
@UseGuards(IdentityGuard)
export class ItineraryController {
  constructor(private readonly dbService: DbService) {}

  @Get(':tripId')
  async byTrip(
    @Identity() identity: RequestIdentity,
    @Param('tripId') tripId: string,
  ) {
    const [itin] = await this.dbService.db
      .select()
      .from(itineraries)
      .where(
        and(
          eq(itineraries.tripId, tripId),
          eq(itineraries.userId, identity.userId),
        ),
      )
      .limit(1);

    if (!itin) {
      return { tripId, days: [] };
    }

    const days = await this.dbService.db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.itineraryId, itin.id));

    const result = [];
    for (const day of days) {
      const items = await this.dbService.db
        .select()
        .from(itineraryItems)
        .where(eq(itineraryItems.dayId, day.id));
      result.push({
        dayNumber: day.dayNumber,
        date: day.date,
        theme: day.theme,
        items: items.map((i) => ({
          id: i.id,
          dayNumber: day.dayNumber,
          date: day.date,
          timeSlot: i.timeSlot,
          itemType: i.itemType,
          title: i.title,
          description: i.description,
          locationName: i.locationName,
          documentId: i.documentId,
        })),
      });
    }

    return {
      tripId,
      itineraryId: itin.id,
      title: itin.title,
      days: result.sort((a, b) => a.dayNumber - b.dayNumber),
    };
  }
}
