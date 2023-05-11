import { Module } from '@nestjs/common';
import { ChatModule } from 'src/chat/chat.module';
import { DatabaseModule } from 'src/database.module';
import { matchhistoryProviders } from 'src/matchhistory/matchhistory.providers';
import { MatchhistoryService } from 'src/matchhistory/matchhistory.service';
import { UserModule } from 'src/user/user.module';
import { userProviders } from 'src/user/user.providers';
import { UserService } from 'src/user/user.service';
import EventsGateway from './events.gateway';

@Module({
  imports: [ChatModule, DatabaseModule, UserModule],
  providers: [EventsGateway, ...userProviders, ...matchhistoryProviders, UserService, MatchhistoryService],
  exports: [UserService, ...userProviders, MatchhistoryService, ...matchhistoryProviders],
})
export class EventsModule {}
