import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { chatProviders } from './chat.providers';
import { DatabaseModule } from '../database.module';
import { UserModule } from '../user/user.module';
import { ChatGateway } from '../events/chat.gateway';
import { UserblacklistModule } from '../userblacklist/userblacklist.module';
import { UserstatusModule } from '../userstatus/userstatus.module';

@Module({
  imports: [DatabaseModule, UserModule, UserblacklistModule, UserstatusModule],
  controllers: [],
  providers: [ChatGateway, ChatService, ...chatProviders],
  exports: [ChatService],
})
export class ChatModule {}
