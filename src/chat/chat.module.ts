import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { chatProviders } from './chat.providers';
import { DatabaseModule } from '../database.module';
import { UserModule } from '../user/user.module';
import { ChatGateway } from '../events/chat.gateway';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [],
  providers: [ChatGateway, ChatService, ...chatProviders],
  exports: [ChatService],
})
export class ChatModule {}
