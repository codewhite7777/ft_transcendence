import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FTAuthGuard } from './ft_auth_guard';

@Controller('/auth')
export class AuthController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @UseGuards(FTAuthGuard)
  async AuthLogic(@Request() req: Request): Promise<string> {
    console.log(this.configService.get<string>('CLIENT_UID'));
    return 'auth page';
  }
}
