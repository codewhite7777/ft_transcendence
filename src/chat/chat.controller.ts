import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { UserService } from 'src/user/user.service';

// Todo: AuthGuard를 추후에 붙여야 한다.
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {}

  @Post()
  async createChannel(@Body() body) {
    const { kind, owner, roomName, roomPassword } = body;
    return await this.chatService.createChannel(
      kind,
      owner,
      roomName,
      roomPassword,
    );
  }

  @Delete()
  async deleteChannel(@Body() body) {
    const { channelId } = body;
    const channel = await this.chatService.getChannelById(channelId);
    const ret = this.chatService.deleteChannel(channel);
    console.log('ret: ', ret);
  }

  @Get()
  async getPublicChannel() {
    return await this.chatService.getChannelByKind(0);
  }

  @Post('/join')
  async joinChannel(@Body() body) {
    const { channelId, userId } = body;
    const channel = this.chatService.getChannelById(channelId);
    // const channel = this.chatService.getChannelById(channelId);
    // return await this.chatService.joinChannel()
    return;
  }

  @Delete('left')
  async leftChannel(@Body() body) {
    const { channelId, userId } = body;
    const channel = this.chatService.getChannelById(channelId);
    // const channel = this.chatService.getChannelById(channelId);
    // return await this.chatService.joinChannel()
    return;
  }
}
