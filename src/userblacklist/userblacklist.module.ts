import { Module } from '@nestjs/common';
import { CookieService } from 'src/cookie/cookie.service';
import { DatabaseModule } from 'src/database.module';
import { UserModule } from 'src/user/user.module';
import { userProviders } from 'src/user/user.providers';
import { UserblacklistController } from './userblacklist.controller';
import { userblacklistProviders } from './userblacklist.providers';
import { UserblacklistService } from './userblacklist.service';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [UserblacklistController],
  providers: [
    UserblacklistService,
    ...userblacklistProviders,
    CookieService,
    ...userProviders,
  ],
  exports: [UserblacklistService, ...userblacklistProviders],
})
export class UserblacklistModule {}
