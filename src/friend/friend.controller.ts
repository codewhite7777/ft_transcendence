import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FriendService } from './friend.service';

@Controller('friend')
export class FriendController {
  constructor(
    private readonly friendService: FriendService,
  ) {}

  @Get('/nickname')
  async getFriendbyNickname(@Query('nickname') nickname) {
    const userNickname = "gshim";
    return "a";
    //return this.friendService.getFriend(1);
  }

  @Get('/id')
  async getFriendbyId(@Query('id') id) {
    const userNickname = "gshim";
    //return this.friendService.getFriend(1);
    return "a";
  }

  @Post()
  async addFriend(@Body('nickname1') nickname1, @Body('nickname2') nickname2) {
    console.log('nickname1: ', nickname1);
    console.log('nickname2: ', nickname2);
    return await this.friendService.addFriend(nickname1, nickname2);
  }
  

}
