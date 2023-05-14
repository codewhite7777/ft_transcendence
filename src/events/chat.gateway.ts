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
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Channelinfo } from '../typeorm/entities/Channelinfo';
import * as bcrypt from 'bcrypt';
import {
  ChannelValidationInterceptor,
  ClientValidationInterceptor,
  RoomValidationInterceptor,
  UserValidationInterceptor,
} from '../intercept/ChannelValidation.intercept';
import { SocketAuthGuard } from '../auth/socket_auth_guard';

type UserStatus = 'online' | 'in-game' | 'in-queue' | 'offline';

@WebSocketGateway(4242, {
  namespace: '/chat',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
    credentials: true,
  },
})
@UseGuards(SocketAuthGuard)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // string말고 유저에 대한 정보 ex) socketId, status
  usMapper: Map<number, string>; // userId = 1, socketid=x

  // Key: roomName, Value: Map<socketId, timestamp (end of mute duration)>
  private mutedUsers: Map<string, Map<string, number>> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {
    this.usMapper = new Map<number, string>();
  }

  afterInit(server: Server) {
    console.log('Chat Server initialized');
  }

  // Todo 클라이언트가 어떤 유저인지 파악하고, 해당 유저가 db상으로 참여한 방을 찾은후 입장시켜야 한다.
  // 입장시켰고, 입장한 채널info 목록을 프론트에게 전달해야 한다.
  async handleConnection(client: any, ...args: any[]): Promise<EventResponse> {
    console.log(`Chat Client connected: ${client.id}: `);
    const userId: number = parseInt(client?.handshake?.headers?.userid, 10);
    if (!userId) return;
    this.usMapper.set(userId, client.id);
    // 유저가 db상으로 접속된 채널 목록을 가져온다.
    const channels: Channelinfo[] = await this.chatService.getChannelInfoByUser(
      userId,
    );
    console.log('현재 유저가 db상으로 join한 채널 목록: ', channels);
    //console.log('channels: ', channels);
    // 유저를 채널 목록들에 모두 join시킨다.
    channels.forEach((channel) => {
      client.join(channel.ch.roomname);
    });

    // made by gpt 🤖
    const channelswithSocketId = channels.map((channel) => ({
      id: channel.ch.id,
      name: channel.ch.roomname,
      kind: channel.ch.kind,
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
    return this.createEventResponse(true, 'connect success', []);
  }

  // 누가 disconnect했는지 어떻게 알지?
  // 파라미터로 클라이언트를 가져올 수 있다.
  // Todo 이후, 참여한 모든 방을 나가도록 처리하면 될듯하다.
  // 이게 가능하다는 것은, 특정 user가 소켓을 연결했을때 특정방으로 바로 입장 시킬수도 있음을 의미한다.
  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log('handleDisconnect');
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

  isMuted(client: Socket, roomName: string) {
    // Get the roomMutedUsers Map for the specified roomId
    const roomMutedUsers = this.mutedUsers.get(roomName);

    if (!roomMutedUsers) return false;
    const muteEndTimestamp = roomMutedUsers.get(client.id);

    if (muteEndTimestamp) {
      const currentTime = Date.now();

      // Todo. 뮤트사용자에게 현재 채팅이 막혔다는 이벤트를 어떻게 발생시킬 것인가?
      if (currentTime < muteEndTimestamp) {
        console.log('muted user...!');
        this.server
          .to(roomName)
          .emit('user-muted', { roomName, muteEndTimestamp });
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
  async createChannel(
    @ConnectedSocket() client,
    @MessageBody(CreateChannelValidationPipe) data,
  ) {
    const { kind, roomName, roomPassword } = data;
    const socketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );
    const clientUser = await this.userService.findUserById(socketUserId);
    if (clientUser === null)
      return this.createErrorEventResponse('유저정보가없어용');
    // 채널 생성(중복검사 yes)
    // Todo. 비밀번호가 있는 채널을 생성할때는 어떻게 할까?
    const newChannel: Channel = await this.chatService.createChannel(
      kind,
      socketUserId,
      roomName,
      roomPassword,
    );
    console.log('create Channel output: ', newChannel);

    // 방장을 참여.
    await this.chatService.joinChannel(newChannel, clientUser, true, true);
    client.join(roomName);

    const welcomeData = {
      kind: newChannel.kind,
      name: roomName,
      users: [{ ...clientUser, socketId: this.usMapper.get(socketUserId) }],
    };
    // client가 들어온 방의 제목을 전달합니다.
    client.emit('welcome', welcomeData);
    this.server.to(roomName).emit('user-join', { roomName, clientUser });
    return this.createEventResponse(true, 'join success', [welcomeData]);
  }

  @SubscribeMessage('getChannel')
  async getChannel(@ConnectedSocket() client, @MessageBody() data) {
    //console.log('detect getChannel: ', client.id, ' ', data);
    //console.log('getAllChannel: ', await this.chatService.getAllChannel());
    const channels = (await this.chatService.getAllChannel()).map(
      (channel) => ({
        id: channel.id,
        kind: channel.kind,
        name: channel.roomname,
        owner: channel.owner.intraid,
      }),
    );
    console.log('getChannel', channels);
    //client.emit('getChannel', this.createEventResponse(true, '', channels));
    client.emit('getChannel', channels);
    //return channels;
  }

  // Todo. user가 채널에서 mute상태인지 확인합니다.
  @SubscribeMessage('chat')
  @UseInterceptors(RoomValidationInterceptor)
  async handleChat(@ConnectedSocket() client, @MessageBody() data) {
    const { roomName, message, channel } = data;
    console.log(`[${roomName}] ${message}`);

    // 검증
    const socketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );
    const clientUser = await this.userService.findUserById(socketUserId);
    if (clientUser === null) {
      return this.createErrorEventResponse(`당신의 user정보가 없습니다.`);
    }

    if (this.isMuted(client, roomName))
      return this.createErrorEventResponse(
        `당신은 ${this.mutedUsers.get(client.id)}까지 mute된 상태입니다.`,
      );

    // dm인 경우 targetRoom은 상대의 id가 된다.
    //const targetRoom = channel?.kind === 3 ? roomName : roomName;
    //console.log('target Room: ', targetRoom);
    client.to(roomName).emit('chat', { roomName, user: clientUser, message });
  }

  //
  @SubscribeMessage('dm')
  //@UseInterceptors(UserValidationInterceptor)
  async handleDm(@ConnectedSocket() client, @MessageBody() data) {
    const { user, message } = data;
    //console.log(`[${roomName}] ${message}`);
    console.log('dm event target:', user);
    user.socketId = this.usMapper.get(user.id);

    // 검증
    const socketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );
    const clientUser = await this.userService.findUserById(socketUserId);
    clientUser.socketId = this.usMapper.get(clientUser.id);
    if (clientUser === null) {
      return this.createErrorEventResponse(`당신의 user정보가 없습니다.`);
    }

    client.to(user.socketId).emit('dm', {
      roomName: `[DM]${clientUser.nickname}`,
      user: clientUser,
      message,
    });
  }

  // socket을 특정 room에 join 시킵니다.
  // Todo: 필터필요.
  // Todo: 채널 밴 데이터가 있는 유저는 예외처리를 해야 합니다.
  @SubscribeMessage('joinChannel')
  @UseInterceptors(RoomValidationInterceptor)
  @UseInterceptors(ClientValidationInterceptor)
  async handleJoin(@ConnectedSocket() client, @MessageBody() data) {
    const { roomName, roomPassword, channel, clientUser } = data;

    // Todo. usMapper 다른 모듈로 분리해서 인터셉터에서 아래 동작 처리할 수 있게 수정하기
    clientUser.socketId = this.usMapper.get(clientUser.id);

    console.log(`joinChannel: ${roomName}`);
    if (client.rooms.has(roomName))
      return this.createErrorEventResponse(
        `Error: 이미 해당 방에 참여중입니다.`,
      );

    // join on db level
    // Todo: channel이 존재하지 않을경우 예외를 던져야 합니다.
    if (await this.chatService.isBanned(channel, clientUser))
      return this.createErrorEventResponse(
        `Error: 당신은 해당 채널에서 Ban 당했습니다.`,
      );

    if (channel.kind === 1) {
      if (roomPassword === undefined)
        return this.createErrorEventResponse(`Error: parameter error`);
      if (!(await bcrypt.compare(roomPassword, channel.roompassword)))
        return this.createErrorEventResponse(`Error: Wrong password`);
    }

    const newChannel = await this.chatService.joinChannel(
      channel,
      clientUser,
      false,
      false,
    );

    // const welcomeData = {
    //   id: channel.id,
    //   kind: channel.kind,
    //   name: roomName,
    //   users: channel.channelinfos.map((channelinfo) => ({
    //     id: channelinfo.user.id,
    //     nickname: channelinfo.user.nickname,
    //     intraId: channelinfo.user.intraid,
    //     socketId: this.usMapper.get(channelinfo.userid),
    //     avatar: channelinfo.user.avatar,
    //     status: this.usMapper.get(channelinfo.userid) ? 'online' : 'offline', // 이 부분은 실제로 상태를 가져오는 코드로 교체해야 합니다.
    //     isOwner: channelinfo.isowner,
    //     isAdmin: channelinfo.isadmin,
    //   })),
    // };

    console.log('channel.channelifos: ', channel.channelinfos);

    const welcomeData = {
      id: channel.id,
      kind: channel.kind,
      name: roomName,
      users: channel.channelinfos.map((channelinfo) => ({
        ...channelinfo,
        ...channelinfo.user,
        socketId: this.usMapper.get(channelinfo.userid),
      })),
    };

    console.log('welcomeData: ', welcomeData);
    // join on socket level
    client.join(roomName);
    this.server.to(roomName).emit('user-join', { roomName, clientUser });
    return this.createEventResponse(true, 'join success', [welcomeData]);
  }

  @SubscribeMessage('invitedChannel')
  @UseInterceptors(RoomValidationInterceptor)
  @UseInterceptors(ClientValidationInterceptor)
  async handleInvited(@ConnectedSocket() client, @MessageBody() data) {
    const { roomName, roomPassword, channel, clientUser } = data;

    // Todo. usMapper 다른 모듈로 분리해서 인터셉터에서 아래 동작 처리할 수 있게 수정하기
    clientUser.socketId = this.usMapper.get(clientUser.id);

    console.log(`joinChannel: ${roomName}`);
    if (client.rooms.has(roomName))
      return this.createErrorEventResponse(
        `Error: 이미 해당 방에 참여중입니다.`,
      );

    const newChannel = await this.chatService.joinChannel(
      channel,
      clientUser,
      false,
      false,
    );

    // const welcomeData = {
    //   id: channel.id,
    //   kind: channel.kind,
    //   name: roomName,
    //   users: channel.channelinfos.map((channelinfo) => ({
    //     id: channelinfo.user.id,
    //     nickname: channelinfo.user.nickname,
    //     intraId: channelinfo.user.intraid,
    //     socketId: this.usMapper.get(channelinfo.userid),
    //     avatar: channelinfo.user.avatar,
    //     status: this.usMapper.get(channelinfo.userid) ? 'online' : 'offline', // 이 부분은 실제로 상태를 가져오는 코드로 교체해야 합니다.
    //     isOwner: channelinfo.isowner,
    //     isAdmin: channelinfo.isadmin,
    //   })),
    // };

    console.log('channel.channelifos: ', channel.channelinfos);

    const welcomeData = {
      id: channel.id,
      kind: channel.kind,
      name: roomName,
      users: channel.channelinfos.map((channelinfo) => ({
        ...channelinfo,
        ...channelinfo.user,
        socketId: this.usMapper.get(channelinfo.userid),
      })),
    };

    console.log('welcomeData: ', welcomeData);
    // join on socket level
    client.join(roomName);
    this.server.to(roomName).emit('user-join', { roomName, clientUser });
    return this.createEventResponse(true, 'join success', [welcomeData]);
  }

  @SubscribeMessage('leftChannel')
  @UseInterceptors(RoomValidationInterceptor)
  @UseInterceptors(ClientValidationInterceptor)
  async handleLeft(@ConnectedSocket() client, @MessageBody() data) {
    const { roomName, channel, clientUser } = data;
    console.log('leftChannel event: ', roomName);

    if (!client.rooms.has(roomName))
      return this.createErrorEventResponse(
        `Error: 클라이언트가 참여한 채널 중 ${roomName}이 존재하지 않습니다.`,
      );

    if (channel.owner.id === clientUser.id)
      return this.createErrorEventResponse(
        `Error: 방장은 채널을 나갈 수 없습니다. 다른 유저에게 방장 권한을 넘기고 다시 시도하세요.`,
      );

    this.server
      .to(roomName)
      .emit(
        'chat',
        `Server🤖: User ${client.id} has left the room ${roomName}`,
      );
    this.server.to(roomName).emit('user-left', { roomName, clientUser });
    client.leave(roomName);
    await this.chatService.leftChannel(channel, clientUser);
    return this.createEventResponse(
      true,
      `Success: 채널 ${roomName}에서 클라이언트 ${clientUser.nickname}가 성공적으로 퇴장했습니다.`,
      [],
    );
  }

  // 특정 채널에서 owner를 내 자신에서 이 사람으로 넘깁니다.
  @SubscribeMessage('delegateChannel')
  @UseInterceptors(ChannelValidationInterceptor)
  async handleDelegate(
    @ConnectedSocket() client,
    @MessageBody()
    { roomName, user, clientUser, channel }: any,
  ) {
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
  @UseInterceptors(ChannelValidationInterceptor)
  async handlePermission(
    @ConnectedSocket() client,
    @MessageBody()
    { roomName, user, clientUser, channel }: any,
  ) {
    // 권한 체크 : admin인가?
    if (!(await this.chatService.isAdmin(channel, clientUser)))
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
  @UseInterceptors(ChannelValidationInterceptor)
  async handleRevoke(
    @ConnectedSocket() client,
    @MessageBody()
    { roomName, user, clientUser, channel }: any,
  ) {
    console.log('handleRevoke');
    // 권한 체크 : admin인가?
    if (!(await this.chatService.isAdmin(channel, clientUser)))
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
  @UseInterceptors(ChannelValidationInterceptor)
  async mute(
    @ConnectedSocket() client,
    @MessageBody()
    { roomName, user, clientUser, channel }: any,
  ) {
    console.log(`roomName: ${roomName}, userId: ${user.id}`);
    const duration = 10;

    // Calculate the mute end timestamp
    const muteEndTimestamp = Date.now() + duration * 1000;

    // Get or create the roomMutedUsers Map for the specified roomId
    let roomMutedUsers = this.mutedUsers.get(roomName);
    if (!roomMutedUsers) {
      roomMutedUsers = new Map();
      this.mutedUsers.set(roomName, roomMutedUsers);
    }

    // Add or update the user to the roomMutedUsers Map
    roomMutedUsers.set(this.usMapper.get(user.id), muteEndTimestamp);

    // Send a message to the user indicating they have been muted
    // Todo. 어떻게 뮤트된 유저에게 이벤트를 전달할지 고민!
    this.server.to(roomName).emit('user-muted', { roomName, muteEndTimestamp });

    // Todo. 누구에게 강퇴당했는지 명시할것.
    this.server
      .to(roomName)
      .emit('chat', `Server🤖: 유저 ${user.nickname}가 Ban 당했습니다!`);
  }

  @SubscribeMessage('ban')
  @UseInterceptors(ChannelValidationInterceptor)
  async handleBan(
    @ConnectedSocket() client,
    @MessageBody()
    { roomName, user, clientUser, channel }: any,
  ) {
    // 요청자가 admin인가?
    if (!this.chatService.isAdmin(channel, user))
      return `Error: 당신은 admin권한이 없습니다.`;

    // 대상자가 방장인가?
    if (user.id === channel.owner.id) return `Error: 대상이 방장입니다.`;

    // db상에서 채널참여 데이터를 삭제한다.
    this.chatService.leftChannel(channel, user);

    // db상에서 채널밴 데이터를 생성한다.
    this.chatService.ban(channel, user);

    this.server.to(roomName).emit('user-banned', { roomName, user });
    // Todo. 누구에게 강퇴당했는지 명시할것.
    this.server
      .to(roomName)
      .emit('chat', `Server🤖: 유저 ${user.nickname}가 Ban 당했습니다!`);
    // socket상에서 room에서 퇴장시킨다.
    client.leave(roomName);

    const response = { event: 'foo', data: 'bar' };
    return `Success: 성공적으로 Ban하였습니다.`;
  }

  @SubscribeMessage('kick')
  @UseInterceptors(ChannelValidationInterceptor)
  async handleKick(
    @ConnectedSocket() client,
    @MessageBody()
    { roomName, user, clientUser, channel }: any,
  ) {
    // 요청자가 admin인가?
    if (!this.chatService.isAdmin(channel, user))
      return `Error: 당신은 admin권한이 없습니다.`;

    // 대상자가 방장인가?
    if (user.id === channel.owner.id) return `Error: 대상이 방장입니다.`;

    // db상에서 채널참여 데이터를 삭제한다.
    this.chatService.leftChannel(channel, user);

    this.server.to(roomName).emit('user-kicked', { roomName, user });
    // Todo. 누구에게 강퇴당했는지 명시할것.
    this.server
      .to(roomName)
      .emit('chat', `Server🤖: 유저 ${user.nickname}가 Kick 당했습니다!`);
    // socket상에서 room에서 퇴장시킨다.
    client.leave(roomName);

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

  @SubscribeMessage('getProfile')
  async getProfile(@ConnectedSocket() client, @MessageBody() data) {
    const { intraId } = data;
    return await this.userService.findUser(intraId);
  }

  @SubscribeMessage('channel-invite')
  @UseInterceptors(ChannelValidationInterceptor)
  async inviteChannel(
    @ConnectedSocket() client,
    @MessageBody()
    { roomName, user, clientUser, channel }: any,
  ) {
    console.log('channel-invite: ', roomName, user, clientUser, channel);

    this.server
      .to(this.usMapper.get(user.id))
      .emit('user-channel-invited', { channel, clientUser });

    return this.createEventResponse(true, `Invitation message sent.`, []);
  }

  //Todo.인터셉터생성.
  @SubscribeMessage('createDm')
  @UseInterceptors(ClientValidationInterceptor)
  @UseInterceptors(UserValidationInterceptor)
  async directMessage(
    @ConnectedSocket() client,
    @MessageBody()
    { user, clientUser }: any,
  ) {
    user.socketId = this.usMapper.get(user.id);
    console.log('directMessage: ', user, clientUser);

    this.server
      .to(this.usMapper.get(user.id))
      //.to(this.usMapper.get(2))
      .emit('user-dm', this.chatService.createDm(user, clientUser));

    return this.createEventResponse(
      true,
      `DM 채널을 성공적으로 생성하였습니다.`,
      [this.chatService.createDm(clientUser, user)],
    );
  }
}
