import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database.module';
import { UserModule } from './user/user.module';
import { CookieModule } from './cookie/cookie.module';
import { FriendModule } from './friend/friend.module';

@Module({
  imports: [AuthModule, UserModule, DatabaseModule, CookieModule, FriendModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
