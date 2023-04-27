import { Module } from '@nestjs/common';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [ChatModule],
  providers: [EventsGateway],
})
export class EventsModule {}
