import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CookieService } from 'src/cookie/cookie.service';
import { UserService } from './user.service';

@Controller('/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly cookieService: CookieService,
  ) {}

  // {
  //   "id": 20,
  //   "intraid": "alee",
  //   "avatar": "https://i.imgflip.com/1rpfag.jpg",
  //   "rating": 1205,
  //   "wincount": 10,
  //   "losecount": 5,
  //   "email": "alee@gmail.com",
  //   "isotp": true
  // }
  @Get()
  async getUser(@Headers('cookie') cookieRaw: string) {
    const cookie = this.cookieService.extractCookie(cookieRaw);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const target = this.userService.getIntraID(cookie);
    const userData = await this.userService.findUser(target);
    if (userData == null) throw new NotFoundException(`client not found.`);
    return userData;
  }

  // {
  //   "result": {
  //     "win": false,
  //     "lose": true
  //   }
  // }
  @Post('/result')
  async updateResult(
    @Headers('cookie') cookieRaw: string,
    @Body('result') result,
  ) {
    const cookie = this.cookieService.extractCookie(cookieRaw);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const target = this.userService.getIntraID(cookie);
    const updateResult = await this.userService.updateResult(target, result);
    if (updateResult == false)
      throw new NotFoundException(`${target} not found.`);
    return;
  }

  // {
  //   "email": "alee@gmail.com"
  // }
  @Post('/email') //ok
  async updateEmail(
    @Headers('cookie') cookieRaw: string,
    @Body('email') email: string,
  ) {
    const cookie = this.cookieService.extractCookie(cookieRaw);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const target = this.userService.getIntraID(cookie);
    const updateEmail = await this.userService.updateEmail(target, email);
    if (updateEmail == false)
      throw new NotFoundException(`${target} not found.`);
    return;
  }

  // {
  //   "otp": true
  // }
  @Post('/otp')
  async updateOtp(
    @Headers('cookie') cookieRaw: string,
    @Body('otp') otp: boolean,
  ) {
    const cookie = this.cookieService.extractCookie(cookieRaw);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const target = this.userService.getIntraID(cookie);
    const updateOtp = await this.userService.updateOtp(target, otp);
    if (updateOtp == false) throw new NotFoundException(`${target} not found.`);
    return;
  }

  // {
  //   "url": "https://i.imgflip.com/1rpfag.jpg"
  // }
  @Post('/avatar')
  async updateAvatarURL(
    @Headers('cookie') cookieRaw: string,
    @Body('url') url: string,
  ) {
    const cookie = this.cookieService.extractCookie(cookieRaw);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const target = this.userService.getIntraID(cookie);
    const updateURL = await this.userService.updateURL(target, url);
    if (updateURL == false) throw new NotFoundException(`${target} not found.`);
    return;
  }

  // {
  //   "intraID": "hena",
  // }
  @Delete('/:id')
  async deleteUser(
    @Headers('cookie') cookieRaw: string,
    @Param('id') intraID: string,
  ) {
    console.log(intraID);
    const cookie = this.cookieService.extractCookie(cookieRaw);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const target = this.userService.getIntraID(cookie);
    if (intraID != target) throw new ForbiddenException('forbbiden request.');
    const delResult = await this.userService.deleteUser(intraID);
    if (delResult == false)
      throw new NotFoundException(`${intraID} not found.`);
    return;
  }
}
