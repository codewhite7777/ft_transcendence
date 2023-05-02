import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import UploadsService from './uploads.service';
import { DatabaseModule } from 'src/database.module';
import { UserService } from 'src/user/user.service';
import { userProviders } from 'src/user/user.providers';
import { CookieService } from 'src/cookie/cookie.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UploadsController],
  providers: [UploadsService,UserService, ...userProviders, CookieService],
  exports: [UserService, ...userProviders],

})
export class UploadsModule {}

