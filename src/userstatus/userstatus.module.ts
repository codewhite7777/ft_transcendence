import { Module } from '@nestjs/common';
import { UserstatusController } from './userstatus.controller';
import { UserstatusService } from './userstatus.service';

@Module({
  controllers: [UserstatusController],
  providers: [UserstatusService],
  exports: [UserstatusService],
})
export class UserstatusModule {}
