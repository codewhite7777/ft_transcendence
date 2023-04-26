import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { CookieService } from 'src/cookie/cookie.service';
import { UserService } from 'src/user/user.service';
import { MatchhistoryService } from './matchhistory.service';
import { Request } from 'express'


@Controller('/matchhistory')
export class MatchhistoryController {
    constructor(
        private readonly userService: UserService,
        private readonly cookieService: CookieService,
        private readonly matchhistoryService: MatchhistoryService,
      ) {}

@Get('/temp')
async dummyCreate(){
  console.log('더미 매치 데이터 생성');
  const min = 1;
  const max = 10;
  const randomInt = Math.floor(Math.random() * (max - min + 1)) + min;
  const client1 = await this.userService.findUser("alee");
  const client2 = await this.userService.findUser("hena");
  await this.matchhistoryService.createMatchHistory(Math.floor(Math.random() * (1 - 0 + 1)) + 0, Math.floor(Math.random() * (1 - 0 + 1)) + 0, Math.floor(Math.random() * (5 - 0 + 1)) + 0, Math.floor(Math.random() * (5 - 0 + 1)) + 0, client1.id, client2.id);
  return;
}

@Get()
async getMatchHistoryList(@Req() req: Request) {
    //debug
    console.log('[매치 히스토리 요청]');
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const intraID = await this.userService.getIntraID(cookie);
    const userData = await this.userService.findUser(intraID);
    console.log(`유저데이터 아이디 : ${userData.id}`);
    const result = await this.matchhistoryService.getMatchHistory(userData.id)
    return result;
    }

  // {
  //  "winnerid":"alee",
  //  "loserid":"hena",
  //  "status":0,
  //  "mapnumber":1,
  //  "winscore":5,
  //  "losescore":3
  // }
  //매치히스토리 추가 요청 - no use
  // @Post()
  // async updateMatchList(@Body() gameData, @Req() req: Request) {
  //   //debug
  //   console.log('[매치히스토리 추가 요청]');

    // const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    // console.log('바디');
    // console.log(gameData);
    // if (cookie == undefined) throw new NotFoundException('cookie not found')
    // const intraID = await this.userService.getIntraID(cookie);
    // const userData = await this.userService.findUser(intraID);
    // const result = await this.matchhistoryService.vaildDataType(gameData);
    // if(result == false)
    // throw new 
    // if (friendID == null) throw new NotFoundException('friend not found.');
    // await this.friendlistService.createFriendList(userData.id, friendID.id);
    // return;
  // }

  //매치히스토리 삭제 요청 - no use
  // @Delete('/:id')
  // async deleteFriendList(@Param('id') delName: string, @Req() req: Request) {
  //   //debug
  //   console.log('[매치히스토리 삭제 요청]');
  //   const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
  //   if (cookie == undefined) throw new NotFoundException('cookie not found');
  //   if (delName == undefined) throw new NotFoundException('method not found');
  //   const intraID = await this.userService.getIntraID(cookie);
  //   const userData = await this.userService.findUser(intraID);
  //   const friendID = await this.userService.findUser(delName);
  //   if (friendID == null) throw new NotFoundException('friend not found.');
  //   // await this.friendlistService.deleteFriendList(userData.id, friendID.id);
  //   return;
  // }
}
