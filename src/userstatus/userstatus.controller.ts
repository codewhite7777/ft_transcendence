import { Controller, Get, Param } from '@nestjs/common';
import { UserstatusService } from './userstatus.service';

@Controller('userstatus')
export class UserstatusController {
  constructor(private readonly userStatusService: UserstatusService) {}

  @Get(':id')
  getUserStatus(@Param('id') userId: number) {
    const userStatus = this.userStatusService.getUserStatus(userId);
    if (userStatus) {
      return {
        status: userStatus.status,
      };
    } else {
      return {
        error: 'User status not found',
      };
    }
  }
}
