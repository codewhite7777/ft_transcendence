import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database.module';
import { UserModule } from './user/user.module';
import { CookieModule } from './cookie/cookie.module';
import { OtpModule } from './otp/otp.module';
import { MailModule } from './mail/mail.module';
import { ChatModule } from './chat/chat.module';
import { FriendlistModule } from './friendlist/friendlist.module';
import { UserblacklistModule } from './userblacklist/userblacklist.module';
import { MatchhistoryModule } from './matchhistory/matchhistory.module';
import { EventsModule } from './events/events.module';
import * as fs from 'fs';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    AuthModule,
    UserModule,
    DatabaseModule,
    CookieModule,
    OtpModule,
    MailModule,
    ChatModule,
    EventsModule,
    FriendlistModule,
    UserblacklistModule,
    MatchhistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor() {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
  }
}
