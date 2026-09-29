import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IdentityGuard, RolesGuard } from './auth/identity';
import { DbModule } from './db/db.module';
import { TripsController } from './modules/trips/trips.controller';
import { VaultController } from './modules/vault/vault.controller';
import { ItineraryController } from './modules/itinerary/itinerary.controller';
import { AgenciesController } from './modules/agencies/agencies.controller';
import { ChatController } from './modules/chat/chat.controller';

@Module({
  imports: [DbModule],
  controllers: [
    TripsController,
    VaultController,
    ItineraryController,
    AgenciesController,
    ChatController,
  ],
  providers: [
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: IdentityGuard,
    },
  ],
})
export class AppModule {}
