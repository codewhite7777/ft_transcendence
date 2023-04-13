import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database.module';
import { UserModule } from 'src/user/user.module';
import { FriendController } from './friend.controller';
import { friendProviders } from './friend.providers';
import { FriendService } from './friend.service';

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [FriendController],
  providers: [FriendService, ...friendProviders],
  exports: [FriendService],
})
export class FriendModule {}
