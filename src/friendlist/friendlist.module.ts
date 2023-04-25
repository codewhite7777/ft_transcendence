import { Module } from '@nestjs/common';
import { CookieService } from 'src/cookie/cookie.service';
import { DatabaseModule } from 'src/database.module';
import { UserModule } from 'src/user/user.module';
import { userProviders } from 'src/user/user.providers';
import { FriendlistController } from './friendlist.controller';
import { friendlistProviders } from './friendlist.providers';
import { FriendlistService } from './friendlist.service';

@Module({
  imports: [DatabaseModule, UserModule],
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
