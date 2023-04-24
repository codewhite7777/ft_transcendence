import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CookieService } from 'src/cookie/cookie.service';
import { UserService } from 'src/user/user.service';
import { UserblacklistService } from './userblacklist.service';

@Controller('/userblacklist')
export class UserblacklistController {
  constructor(
    private readonly userService: UserService,
    private readonly cookieService: CookieService,
    private readonly userblacklistService: UserblacklistService,
  ) {}

  @Get()
  async getBlackList(@Req() req: Request) {
    //debug
    console.log('[친구 블랙 리스트 요청]');
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const intraID = await this.userService.getIntraID(cookie);
    const userData = await this.userService.findUser(intraID);
    const result = await this.userblacklistService.getBlackList(userData.id);
    return result;
  }

  //{
  //  "friend":"alee"
  //}
  //친구 블랙리스트 추가 요청
  @Post()
  async updateFriendList(
    @Body('blacklist') blacklist: string,
    @Req() req: Request,
  ) {
    //debug
    console.log('[친구 블랙리스트 추가 요청]');
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    if (blacklist == undefined) throw new NotFoundException('method not found');
    const intraID = await this.userService.getIntraID(cookie);
    const userData = await this.userService.findUser(intraID);
    const blacklistID = await this.userService.findUser(blacklist);
    if (blacklistID == null)
      throw new NotFoundException('blacklist not found.');
    await this.userblacklistService.createBlackList(
      userData.id,
      blacklistID.id,
    );
    return;
  }

  //친구 블랙리스트 삭제 요청
  @Delete('/:id')
  async deleteFriendList(@Param('id') delName: string, @Req() req: Request) {
    //debug
    console.log('[친구 삭제 요청]');
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    if (delName == undefined) throw new NotFoundException('method not found');
    const intraID = await this.userService.getIntraID(cookie);
    const userData = await this.userService.findUser(intraID);
    const blacklistID = await this.userService.findUser(delName);
    if (blacklistID == null) throw new NotFoundException('friend not found.');
    await this.userblacklistService.deleteBlackList(
      userData.id,
      blacklistID.id,
    );
    return;
  }
}
