import { Module } from '@nestjs/common';
import { CookieService } from '../cookie/cookie.service';
import { DatabaseModule } from '../database.module';
import { UserController } from './user.controller';
import { userProviders } from './user.providers';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService, ...userProviders, CookieService],
  exports: [UserService, ...userProviders],
})
export class UserModule {}
