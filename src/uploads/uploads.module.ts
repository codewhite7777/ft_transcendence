import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import UploadsService from './uploads.service';
import { DatabaseModule } from 'src/database.module';
import { UserService } from 'src/user/user.service';
import { userProviders } from 'src/user/user.providers';
import { CookieService } from 'src/cookie/cookie.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [UploadsController],
  providers: [UploadsService, CookieService],
  exports: [],
})
export class UploadsModule {}
