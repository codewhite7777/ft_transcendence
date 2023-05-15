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
import { CookieService } from '../cookie/cookie.service';
import { UserService } from '../user/user.service';
import { FriendlistService } from './friendlist.service';

@Controller('/friendlist')
export class FriendlistController {
  constructor(
    private readonly userService: UserService,
    private readonly cookieService: CookieService,
    private readonly friendlistService: FriendlistService,
  ) {}

  @Get()
  async getFriendList(@Req() req: Request) {
    //debug
    console.log('[친구 리스트 요청]');
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const intraID = await this.userService.getIntraID(cookie);
    const userData = await this.userService.findUser(intraID);
    const result = await this.friendlistService.getFriendList2(userData.id);
    return result;
  }

  //{
  //  "friend":"alee"
  //}
  //친구 추가 요청
  @Post()
  async updateFriendList(@Body('friend') friend: string, @Req() req: Request) {
    //debug
    console.log('[친구 추가 요청]');
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    if (friend == undefined) throw new NotFoundException('method not found');
    const intraID = await this.userService.getIntraID(cookie);
    const userData = await this.userService.findUser(intraID);
    const friendID = await this.userService.findUser(friend);
    if (friendID == null) throw new NotFoundException('friend not found.');
    await this.friendlistService.createFriendList(userData.id, friendID.id);
    return;
  }

  //친구 삭제 요청
  @Delete('/:id')
  async deleteFriendList(@Param('id') delName: string, @Req() req: Request) {
    //debug
    console.log('[친구 삭제 요청]');
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    if (delName == undefined) throw new NotFoundException('method not found');
    const intraID = await this.userService.getIntraID(cookie);
    const userData = await this.userService.findUser(intraID);
    const friendID = await this.userService.findUser(delName);
    if (friendID == null) throw new NotFoundException('friend not found.');
    await this.friendlistService.deleteFriendList(userData.id, friendID.id);
    return;
  }
}
