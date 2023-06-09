import { Module } from '@nestjs/common';
import { CookieService } from '../cookie/cookie.service';
import { DatabaseModule } from '../database.module';
import { UserModule } from '../user/user.module';
import { userProviders } from '../user/user.providers';
import { FriendlistController } from './friendlist.controller';
import { friendlistProviders } from './friendlist.providers';
import { FriendlistService } from './friendlist.service';
import { UserstatusModule } from 'src/userstatus/userstatus.module';

@Module({
  imports: [DatabaseModule, UserModule, UserstatusModule],
  controllers: [FriendlistController],
  providers: [
    FriendlistService,
    ...friendlistProviders,
    CookieService,
    ...userProviders,
  ],
  exports: [FriendlistService, ...friendlistProviders],
})
export class FriendlistModule {}
