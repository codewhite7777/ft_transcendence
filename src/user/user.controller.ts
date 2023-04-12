import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CookieService } from 'src/cookie/cookie.service';
import { UserService } from './user.service';

@Controller('/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly cookieService: CookieService,
  ) {}
  @Get()
  async getUser(
    @Param('id') intraID: string,
    @Headers('cookie') cookieRaw: string,
  ) {
    console.log(`cookieRaw : ${cookieRaw}`);
    const cookie = this.cookieService.extractCookie(cookieRaw);
    console.log(`client Key : ${this.userService.getIntraID(cookie)}`); //??
    console.log(`cookie Key : ${cookie}`);
    // console.log(cookie);//
    // console.log(`who : ${this.userService.getIntraID(cookie)}`);
    const userData = await this.userService.findUser(intraID);
    if (userData == null) throw new NotFoundException(`${intraID} not found.`);
    return userData;
  }

  // {
  //   "intraID": "hena",
  //   "result": {
  //     "win": false,
  //     "lose": true
  //   }
  // }
  @Post('/result')
  async updateResult(@Body('intraID') intraID: string, @Body('result') result) {
    const updateResult = await this.userService.updateResult(intraID, result);
    if (updateResult == false)
      throw new NotFoundException(`${intraID} not found.`);
    return;
  }

  // {
  //   "intraID": "alee",
  //   "email": "alee@gmail.com"
  // }
  @Post('/email')
  async updateEmail(
    @Body('intraID') intraID: string,
    @Body('email') email: string,
  ) {
    const updateEmail = await this.userService.updateEmail(intraID, email);
    if (updateEmail == false)
      throw new NotFoundException(`${intraID} not found.`);
    return;
  }

  // {
  //   "intraID": "hena",
  //   "opt": true
  // }
  @Post('/opt')
  async updateOpt(@Body('intraID') intraID: string, @Body('opt') opt: boolean) {
    const updateOpt = await this.userService.updateOpt(intraID, opt);
    if (updateOpt == false)
      throw new NotFoundException(`${intraID} not found.`);
    return;
  }

  // {
  //   "intraID": "hena",
  //   "url": "https://i.imgflip.com/1rpfag.jpg"
  // }
  @Post('/avatar')
  async updateAvatarURL(
    @Body('intraID') intraID: string,
    @Body('url') url: string,
  ) {
    const updateURL = await this.userService.updateURL(intraID, url);
    if (updateURL == false)
      throw new NotFoundException(`${intraID} not found.`);
    return;
  }

  // {
  //   "intraID": "hena",
  // }
  @Delete('/:id')
  async deleteUser(@Param('id') intraID: string) {
    const delResult = await this.userService.deleteUser(intraID);
    if (delResult == false)
      throw new NotFoundException(`${intraID} not found.`);
    return;
  }
}
