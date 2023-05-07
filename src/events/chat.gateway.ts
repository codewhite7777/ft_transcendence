import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../chat/chat.service';
import { Channel } from '../typeorm/entities/Channel';
import { User } from '../typeorm/entities/User';
import { UserService } from '../user/user.service';
import { EventResponse } from './eventResponse.interface';
import { CreateChannelValidationPipe } from '../pipes/chat.pipe';
import { UseFilters } from '@nestjs/common';
import { SocketParameterValidationExceptionFilter } from './exceptionFilter';
import { Channelinfo } from 'src/typeorm/entities/Channelinfo';
import * as bcrypt from 'bcrypt';
import { ChannelValidationPipe } from 'src/pipes/chat.pipe';

type UserStatus = 'online' | 'in-game' | 'in-queue' | 'offline';

// 이 설정들이 뭘하는건지, 애초에 무슨 레포를 보고 이것들을 찾을 수 있는지 전혀 모르겠다.
@WebSocketGateway(4242, {
  namespace: '/chat',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
    credentials: true,
  },
}) // 무조건 만들어야 에러가 안나게 하는부분인가봄.
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // string말고 유저에 대한 정보 ex) socketId, status
  usMapper: Map<number, string>; // userId = 1, socketid=x

  private mutedUsers: Map<string, number> = new Map(); // Key: socket.id, Value: timestamp (end of mute duration)

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {
    this.usMapper = new Map<number, string>();
  }

  afterInit(server: Server) {
    console.log('Chat Socket initialized');
  }

  // Todo 클라이언트가 어떤 유저인지 파악하고, 해당 유저가 db상으로 참여한 방을 찾은후 입장시켜야 한다.
  // 입장시켰고, 입장한 채널info 목록을 프론트에게 전달해야 한다.
  async handleConnection(client: any, ...args: any[]) {
    console.log(
      `Chat Client connected: ${client.id}: `,
      client?.handshake?.userid,
    );
    const userId: number = parseInt(client?.handshake?.headers?.userid, 10);
    console.log(userId);
    if (userId) {
      this.usMapper.set(userId, client.id);
      // 유저가 db상으로 접속된 채널 목록을 가져온다.
      const channels: Channelinfo[] =
        await this.chatService.getChannelInfoByUser(userId);
      console.log('channels: ', channels);
      // 유저를 채널 목록들에 모두 join시킨다.
      channels.forEach((channel) => {
        client.join(channel.ch.roomname);
      });

      // made by gpt 🤖
      const channelswithSocketId = channels.map((channel) => ({
        id: channel.ch.id,
        name: channel.ch.roomname,
        users: channel.ch.channelinfos.map((channelinfo) => ({
          id: channelinfo.user.id,
          nickname: channelinfo.user.nickname,
          intraId: channelinfo.user.intraid,
          socketId: this.usMapper.get(channelinfo.userid),
          avatar: channelinfo.user.avatar,
          status: this.usMapper.get(channelinfo.userid) ? 'online' : 'offline', // 이 부분은 실제로 상태를 가져오는 코드로 교체해야 합니다.
          isOwner: channelinfo.isowner,
          isAdmin: channelinfo.isadmin,
        })),
        showUserList: false,
      }));

      client.emit(
        'initChannels',
        this.createEventResponse(true, '', channelswithSocketId),
      );
    }
  }

  // 누가 disconnect했는지 어떻게 알지?
  // 파라미터로 클라이언트를 가져올 수 있다.
  // Todo 이후, 참여한 모든 방을 나가도록 처리하면 될듯하다.
  // 이게 가능하다는 것은, 특정 user가 소켓을 연결했을때 특정방으로 바로 입장 시킬수도 있음을 의미한다.
  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log('handleDisconnect');
    //console.log('client: ', client);
    //console.log(`${client.id} disconnected`);
    // const rooms = Object.keys(client.rooms);
    // rooms.forEach((room) => {
    //   this.server
    //     .to(room)
    //     .emit('userLeft', `User ${client.id} has left the room ${room}`);
    //   client.leave(room);
    // });
  }

  createEventResponse(
    success: boolean,
    message: string,
    data: any[] = [],
  ): EventResponse {
    return {
      success,
      message,
      data,
    };
  }

  createErrorEventResponse(message: string): EventResponse {
    return {
      success: false,
      message,
      data: [],
    };
  }

  getNumberOfSocketsInRoom(roomName) {
    const room = this.server.of('/').adapter.rooms.get(roomName);
    return room ? room.size : 0;
  }

  isMuted(client: Socket) {
    const muteEndTimestamp = this.mutedUsers.get(client.id);

    if (muteEndTimestamp) {
      const currentTime = Date.now();

      // Todo. 뮤트사용자에게 현재 채팅이 막혔다는 이벤트를 어떻게 발생시킬 것인가?
      if (currentTime < muteEndTimestamp) {
        return true;
      } else {
        this.mutedUsers.delete(client.id);
        return false;
      }
    }
    return false;
  }

  // Chat Login Start

  @SubscribeMessage('createChannel')
  @UseFilters(SocketParameterValidationExceptionFilter)
  async createChannel(
    @ConnectedSocket() client,
    @MessageBody(CreateChannelValidationPipe) data,
  ) {
    const { kind, roomName, roomPassword } = data;

    // user 검증
    const user: User = await this.userService.findUser(client.intraID);
    if (user == null)
      return this.createErrorEventResponse(`당신의 회원정보가 없습니다!`);
    const socketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );

    // 채널 생성(중복검사 yes)
    // Todo. 비밀번호가 있는 채널을 생성할때는 어떻게 할까?
    const newChannel: Channel = await this.chatService.createChannel(
      kind,
      socketUserId,
      roomName,
      roomPassword,
    );

    // 방장을 참여.
    await this.chatService.joinChannel(newChannel, user, true, true);
    client.join(roomName);

    const welcomeData = {
      // num: this.server.sockets.adapter.rooms.get(roomName).size,
      num: 10,
      roomName,
    };
    // client가 들어온 방의 제목을 전달합니다.
    client.emit('welcome', welcomeData);
    return this.createEventResponse(true, '채널 생성 성공', [welcomeData]);
  }

  @SubscribeMessage('getChannel')
  async getChannel(@ConnectedSocket() client, @MessageBody() data) {
    console.log('detect getChannel: ', client.id, ' ', data);
    //const { kind } = data;

    // const channels = (await this.chatService.getChannelByKind(kind)).map(
    // for debug
    console.log('getAllChannel: ', await this.chatService.getAllChannel());

    const channels = (await this.chatService.getAllChannel()).map(
      (channel) => ({
        kind: channel.kind,
        owner: channel.owner.intraid,
        roomname: channel.roomname,
      }),
    );
    console.log('getChannel', channels);
    client.emit('getChannel', channels);
    //return channels;
  }

  // Todo. user가 채널에서 mute상태인지 확인합니다.
  @SubscribeMessage('chat')
  async handleChat(@ConnectedSocket() client, @MessageBody() data) {
    const { roomName, message } = data;
    console.log('@chat: ', data);
    console.log('@message: ', data);

    if (this.isMuted(client))
      return this.createErrorEventResponse(
        `당신은 ${this.mutedUsers.get(client.id)}까지 mute된 상태입니다.`,
      );

    client
      .to(roomName)
      .emit('chat', { roomName, user: client.nickname, message });
  }

  // socket을 특정 room에 join 시킵니다.
  // Todo: 채널 밴 데이터가 있는 유저는 예외처리를 해야 합니다.
  @SubscribeMessage('joinChannel')
  async handleJoin(
    @ConnectedSocket() client,
    @MessageBody(ChannelValidationPipe) data,
  ) {
    const { userId, roomName, roomPassword } = data;
    console.log('joinChannel: ', userId, ', ', roomName);
    if (!userId || !roomName) return `Error: parameter error`;
    if (client.rooms.has(roomName))
      return `Error: 이미 해당 방에 참여중입니다.`;

    // join on db level
    // Todo: channel이 존재하지 않을경우 예외를 던져야 합니다.
    const channel: Channel = await this.chatService.getChannelByName(roomName);
    if (channel === null) return `Error: Channel doesn't exist`;
    const user: User = await this.userService.findUserById(userId);
    if (user === null) return `Error: User doesn't exist`;

    if (await this.chatService.isBanned(channel, user))
      return `Error: 당신은 해당 채널에서 Ban 당했습니다.`;

    if (channel.kind === 1) {
      if (roomPassword === undefined) return `Error: parameter error`;
      if (!(await bcrypt.compare(roomPassword, channel.roompassword)))
        return `Error: Wrong password`;
    }

    await this.chatService.joinChannel(channel, user, false, false);
    // join on socket level
    client.join(roomName);

    // 입장한 유저한테 어떤 정보를 제시할 것인가?
    /*
      1. Channel에 포함된 유저 목록(db, socket)
      Todo. channel.channelinfo를 보낼건데, socketid도 포함시켜서 보내기.
      const roomClientsCount = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    */
    console.log('adapter: ', this.server.sockets.adapter);
    const welcomeData = {
      num: this.server.sockets.adapter?.rooms.get(roomName)?.size || 0,
      roomName,
      users: channel.channelinfos.map((user) => ({
        ...user,
        socketId: this.usMapper.get(user.userid),
      })),
    };
    console.log('welcomeData: ', welcomeData);
    this.server.to(roomName).emit('welcome', welcomeData);
  }

  @SubscribeMessage('leftChannel')
  async handleLeft(
    @ConnectedSocket() client,
    @MessageBody(ChannelValidationPipe) data,
  ) {
    const { roomName, userId } = data;
    if (!roomName || !userId)
      return `Error: 필요한 인자가 주어지지 않았습니다.`;
    console.log('leftChannel event: ', roomName, userId);

    if (!client.rooms.has(roomName))
      return `Error: 클라이언트가 참여한 채널 중 ${roomName}이 존재하지 않습니다.`;

    const channel = await this.chatService.getChannelByName(roomName);
    if (channel === null) return `Error: 알수없는 채널입니다. ${roomName}`;
    const user = await this.userService.findUserById(userId);
    if (user === null) return `Error: 알수없는 유저입니다.`;
    if (channel.owner.id === userId)
      return `Error: 방장은 채널을 나갈 수 없습니다. 다른 유저에게 방장 권한을 넘기고 다시 시도하세요.`;

    this.server
      .to(roomName)
      .emit(
        'chat',
        `Server🤖: User ${client.id} has left the room ${roomName}`,
      );
    client.leave(roomName);
    await this.chatService.leftChannel(channel, user);
    return `Success: 채널 ${roomName}에서 클라이언트 ${user.intraid}가 성공적으로 퇴장했습니다.`;
  }

  // 특정 채널에서 owner를 내 자신에서 이 사람으로 넘깁니다.
  @SubscribeMessage('delegateChannel')
  async handleDelegate(
    @ConnectedSocket() client,
    @MessageBody(ChannelValidationPipe) data,
  ) {
    // 인자검사
    const { roomName, userId } = data;
    const soketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );

    if (!client.rooms.has(roomName))
      return `Error: 클라이언트가 참여한 채널 중 ${roomName}이 존재하지 않습니다.`;

    const channel = await this.chatService.getChannelByName(roomName);
    if (channel === null) return `Error: 알수없는 채널입니다. ${roomName}`;
    const user = await this.userService.findUserById(userId);
    if (user === null) return `Error: 알수없는 유저입니다.`;
    if (channel.owner.id !== soketUserId)
      return `Error: 당신은 방장이 아닙니다!`;

    // 핵심 위임로직.
    await this.chatService.delegate(channel, user);

    this.server.to(roomName).emit('owner-granted', { roomName, user });
    this.server
      .to(roomName)
      .emit(
        'chat',
        `Server🤖: 유저 ${client.id}가 ${roomName}의 새 방장입니다!`,
      );
    return `Success: 채널 ${roomName}의 방장 권한을 클라이언트 ${user.intraid}에게 성공적으로 위임했습니다.`;
  }

  // 특정 채널에서 user에게 admin권한을 부여합니다.
  @SubscribeMessage('permissionChannel')
  async handlePermission(
    @ConnectedSocket() client,
    @MessageBody(ChannelValidationPipe) data,
  ) {
    // 인자검사
    const { roomName, userId } = data;
    const soketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );

    if (!client.rooms.has(roomName))
      return `Error: 클라이언트가 참여한 채널 중 ${roomName}이 존재하지 않습니다.`;

    const channel = await this.chatService.getChannelByName(roomName);
    if (channel === null) return `Error: 알수없는 채널입니다. ${roomName}`;
    const user = await this.userService.findUserById(userId);
    if (user === null) return `Error: 알수없는 유저입니다.`;
    const socketUser = await this.userService.findUserById(soketUserId);

    // 권한 체크 : admin인가?
    if (!(await this.chatService.isAdmin(channel, socketUser)))
      return `Error: 당신은 Admin 권한이 없습니다.`;
    // 핵심 위임로직.
    await this.chatService.permission(channel, user);

    // 같은방 사람들에게 공지
    this.server.to(roomName).emit('admin-granted', { roomName, user });
    this.server
      .to(roomName)
      .emit(
        'chat',
        `Server🤖: 유저 ${user.nickname}가 ${roomName}의 Admin권한을 획득했습니다!`,
      );

    return `Success: 채널 ${roomName}의 Admin 권한을 클라이언트 ${user.intraid}에게 성공적으로 부여했습니다.`;
  }

  // 특정 채널에서 user에게 admin권한을 회수합니다.
  @SubscribeMessage('revokeChannel')
  async handleRevoke(
    @ConnectedSocket() client,
    @MessageBody(ChannelValidationPipe) data,
  ) {
    console.log('handleRevoke');
    // 인자검사
    const { roomName, userId } = data;
    const soketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );
    if (!client.rooms.has(roomName))
      return `Error: 클라이언트가 참여한 채널 중 ${roomName}이 존재하지 않습니다.`;

    const channel = await this.chatService.getChannelByName(roomName);
    if (channel === null) return `Error: 알수없는 채널입니다. ${roomName}`;
    const user = await this.userService.findUserById(userId);
    if (user === null) return `Error: 알수없는 유저입니다.`;
    const socketUser = await this.userService.findUserById(soketUserId);

    // 권한 체크 : admin인가?
    if (!(await this.chatService.isAdmin(channel, socketUser)))
      return `Error: 당신은 Admin 권한이 없습니다.`;
    // 핵심 위임로직.
    await this.chatService.revoke(channel, user);

    this.server.to(roomName).emit('admin-revoked', { roomName, user });
    this.server
      .to(roomName)
      .emit(
        'chat',
        `Server🤖: 유저 ${user.nickname}가 ${roomName}의 Admin권한을 잃었습니다!`,
      );
    return `Success: 채널 ${roomName}의 Admin 권한을 클라이언트 ${user.nickname}에게서 회수했습니다.`;
  }

  // 특정 채널에서 user에게 admin권한을 회수합니다.
  @SubscribeMessage('sampleEvent')
  async sampleEvent(@ConnectedSocket() client, @MessageBody() data) {
    const response = { event: 'foo', data: 'bar' };
    return response;
  }

  // Todo. payload를 저렇게 깔끔하게 표시할 수 있구나.. 다른 함수들에도 적용하자.
  @SubscribeMessage('mute')
  async mute(client: Socket, payload: { socketId: string }): Promise<void> {
    const { socketId } = payload;
    const duration = 10;
    if (!socketId) return;

    // Calculate the mute end timestamp
    const muteEndTimestamp = Date.now() + duration * 1000;

    // Add or update the user to the mutedUsers Map
    this.mutedUsers.set(socketId, muteEndTimestamp);

    // Send a message to the user indicating they have been muted
    // Todo. 어떻게 뮤트된 유저에게 이벤트를 전달할지 고민!
    client.to(socketId).emit('muted', { muteEndTimestamp });
  }

  @SubscribeMessage('ban')
  async handleBan(
    @ConnectedSocket() client,
    @MessageBody(ChannelValidationPipe) data,
  ) {
    // 인자검사
    const { roomName, userId } = data;

    if (!client.rooms.has(roomName))
      return `Error: 클라이언트가 참여한 채널 중 ${roomName}이 존재하지 않습니다.`;

    const channel = await this.chatService.getChannelByName(roomName);
    if (channel === null) return `Error: 알수없는 채널입니다. ${roomName}`;
    const user = await this.userService.findUserById(userId);
    if (user === null) return `Error: 알수없는 유저입니다.`;

    // 요청자가 admin인가?
    if (!this.chatService.isAdmin(channel, user))
      return `Error: 당신은 admin권한이 없습니다.`;

    // 대상자가 방장인가?
    if (userId === channel.owner.id) return `Error: 대상이 방장입니다.`;

    // db상에서 채널참여 데이터를 삭제한다.
    this.chatService.leftChannel(channel, user);

    // db상에서 채널밴 데이터를 생성한다.
    this.chatService.ban(channel, user);

    // socket상에서 room에서 퇴장시킨다.
    client.leave(roomName);
    this.server.to(roomName).emit('user-banned', { roomName, user });
    // Todo. 누구에게 강퇴당했는지 명시할것.
    this.server
      .to(roomName)
      .emit('chat', `Server🤖: 유저 ${user.nickname}가 Ban 당했습니다!`);

    const response = { event: 'foo', data: 'bar' };
    return `Success: 성공적으로 Ban하였습니다.`;
  }

  @SubscribeMessage('kick')
  async handleKick(
    @ConnectedSocket() client,
    @MessageBody(ChannelValidationPipe) data,
  ) {
    // 인자검사
    const { roomName, userId } = data;

    if (!client.rooms.has(roomName))
      return `Error: 클라이언트가 참여한 채널 중 ${roomName}이 존재하지 않습니다.`;

    const channel = await this.chatService.getChannelByName(roomName);
    if (channel === null) return `Error: 알수없는 채널입니다. ${roomName}`;
    const user = await this.userService.findUserById(userId);
    if (user === null) return `Error: 알수없는 유저입니다.`;

    // 요청자가 admin인가?
    if (!this.chatService.isAdmin(channel, user))
      return `Error: 당신은 admin권한이 없습니다.`;

    // 대상자가 방장인가?
    if (userId === channel.owner.id) return `Error: 대상이 방장입니다.`;

    // db상에서 채널참여 데이터를 삭제한다.
    this.chatService.leftChannel(channel, user);

    // socket상에서 room에서 퇴장시킨다.
    client.leave(roomName);
    this.server.to(roomName).emit('user-kicked', { roomName, user });
    // Todo. 누구에게 강퇴당했는지 명시할것.
    this.server
      .to(roomName)
      .emit('chat', `Server🤖: 유저 ${user.nickname}가 Kick 당했습니다!`);

    const response = { event: 'foo', data: 'bar' };
    return `Success: 성공적으로 Kick하였습니다.`;
  }

  @SubscribeMessage('getFriend')
  async getFriend(@ConnectedSocket() client, @MessageBody() data) {
    // hi
    // socket의 User를 가져온다.
    const userId = client?.handshake?.userid; // <- 이 부분은 client인자에서 파이프를 통해 한번 걸러서 가져오는게 좋을 것 같아.
    const user = await this.userService.findUserById(userId);
    if (user === null) return `Error: 알수없는 유저입니다.`;
    // User를 Friend로 추가한 유저들의 리스트를 가져온다
    // 유저리스트의 각 유저들의 socketid를 넣어준다.
    const userList = await this.chatService.getFriend(userId);
    const userListwithSocketId = userList.map((user) => ({
      ...user,
      socketId: this.usMapper.get(user.userId.id),
    }));
    // 유저리스트를 반환한다
    return userListwithSocketId;
  }

  @SubscribeMessage('state')
  async updateFriendState(@ConnectedSocket() client, @MessageBody() data) {
    const status: UserStatus = data.status;

    // socket의 User를 가져온다.
    const userId = client?.handshake?.userid; // <- 이 부분은 client인자에서 파이프를 통해 한번 걸러서 가져오는게 좋을 것 같아.
    const user = await this.userService.findUserById(userId);
    if (user === null) return `Error: 알수없는 유저입니다.`;
    // User를 Friend로 추가한 유저들의 리스트를 가져온다
    // 유저리스트의 각 유저들의 socketid를 넣어준다.
    const userList = await this.chatService.getFriend(userId);
    const updateData = { userId, status };
    userList.forEach((user) =>
      this.server
        .to(this.usMapper.get(user.userId.id))
        .emit('state', updateData),
    );

    return 'Success';
  }
}
