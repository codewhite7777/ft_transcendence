import { Module } from '@nestjs/common';
import { CookieService } from 'src/cookie/cookie.service';
import { DatabaseModule } from 'src/database.module';
import { UserController } from './user.controller';
import { userProviders } from './user.providers';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService, ...userProviders, CookieService],
  exports: [UserService],
})
export class UserModule {}
