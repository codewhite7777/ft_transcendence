import { Module } from '@nestjs/common';
import { CookieService } from '../cookie/cookie.service';
import { DatabaseModule } from '../database.module';
import { UserModule } from '../user/user.module';
import { userProviders } from '../user/user.providers';
import { MatchhistoryController } from './matchhistory.controller';
import { matchhistoryProviders } from './matchhistory.providers';
import { MatchhistoryService } from './matchhistory.service';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [MatchhistoryController],
  providers: [
    MatchhistoryService,
    ...matchhistoryProviders,
    CookieService,
    ...userProviders,
  ],
  exports: [MatchhistoryService, ...matchhistoryProviders],
})
export class MatchhistoryModule {}
