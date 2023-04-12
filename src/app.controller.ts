import { Controller, Get, Headers, Param, Req } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@Headers() header: ParameterDecorator): string {
    // console.log(header);
    // console.log(header['cookie']);
    return this.appService.getHello();
  }
}
