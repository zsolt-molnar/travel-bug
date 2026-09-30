import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './auth/identity';
import { DbModule } from './db/db.module';
import { TripsController } from './modules/trips/trips.controller';
import { VaultController } from './modules/vault/vault.controller';
import { ItineraryController } from './modules/itinerary/itinerary.controller';
import { AgenciesController } from './modules/agencies/agencies.controller';
import { ChatController } from './modules/chat/chat.controller';
import { PlacesController } from './modules/places/places.controller';
import { GemsController } from './modules/gems/gems.controller';
import { MeController } from './modules/me/me.controller';
import { MessagesController } from './modules/messages/messages.controller';
import { NotificationsController } from './modules/notifications/notifications.controller';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [
    TripsController,
    VaultController,
    ItineraryController,
    AgenciesController,
    ChatController,
    PlacesController,
    GemsController,
    MeController,
    MessagesController,
    NotificationsController,
  ],
  providers: [
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
