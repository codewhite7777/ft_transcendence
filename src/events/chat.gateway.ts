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
import { Server } from 'socket.io';
import { ChatService } from 'src/chat/chat.service';
import { Channel } from 'src/typeorm/entities/Channel';
import { User } from 'src/typeorm/entities/User';
import { UserService } from 'src/user/user.service';

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

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {}

  afterInit(server: Server) {
    console.log('Chat Socket initialized');
  }

  handleConnection(client: any, ...args: any[]) {
    console.log(`Chat Client connected: ${client.id}`);
    //console.log('Chat Client connected: ', client);
  }

  // 누가 disconnect했는지 어떻게 알지?
  handleDisconnect() {
    console.log('WebSocketateway disconnected');
  }

  // Chat Login Start

  /*
    data = {
      "kind": 0,
      "roomName": "sample room name",
      "roomPassword": "sample room name", <- optional property
    }
  */
  @SubscribeMessage('createChannel')
  async createChannel(@ConnectedSocket() client, @MessageBody() data) {
    console.log('detect createChannel: ', client, ' ', data);
    const { kind, roomName } = data;

    // user 검증
    const user: User = await this.userService.findUser(client.intraID);
    if (user == null) throw Error("There's no user!");
    console.log('user: ', user);

    // 채널 생성(중복검사 yes)
    const newChannel: Channel = await this.chatService.createChannel(
      kind,
      client.userId,
      //client.intraID,
      roomName,
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
  }

  // socket의 메시지를 room내부의 모든 이들에게 전달합니다.
  /*
  data = {
    "message": "hello world!",
    "roomName": ""
  }
  */
  @SubscribeMessage('chat')
  async handleChat(@ConnectedSocket() client, @MessageBody() data) {
    const { roomName, message } = data;
    console.log('@chat: ', data);
    console.log('@message: ', data);

    client
      .to(roomName)
      .emit('chat', { roomName, user: client.nickname, message });
  }

  // socket을 특정 room에 join 시킵니다.
  // Todo: 이미 참여한 유저에 대해서 예외처리를 해야 합니다.
  @SubscribeMessage('joinChannel')
  async handleJoin(@ConnectedSocket() client, @MessageBody() data) {
    const { userId, roomName } = data;
    console.log('joinChannel: ', userId, ', ', roomName);
    if (!userId || !roomName) return `Error: parameter error`;
    // join on db level
    // Todo: channel이 존재하지 않을경우 예외를 던져야 합니다.
    const channel: Channel = await this.chatService.getChannelByName(roomName);
    if (channel === null) throw Error("Channel doesn't exist");
    const user: User = await this.userService.findUserById(userId);
    console.log('user: ', user);
    if (user === null) throw Error("User doesn't exist");
    await this.chatService.joinChannel(channel, user, false, false);
    // join on socket level
    client.join(roomName);
    console.log('client.rooms: ', client.rooms);

    console.log('b###server: ', this.server);
    console.log('b###server.sockets: ', this.server.sockets);

    // 입장한 유저한테 어떤 정보를 제시할 것인가?
    /*
      1. Channel에 포함된 유저 목록(db, socket)
      2. Channle에 포함된 유
    */
    // const dbUsers = channel.users;
    // const socketUsers = this.server.sockets.adapter.rooms.get(roomName);
    // console.log('a###rooms: ', this.server.sockets.adapter);
    // console.log(
    //   `[${roomName}] 게임룸 현황(${socketUsers.size}/${dbUsers.length}): `,
    //   dbUsers,
    //   socketUsers,
    // );
    const welcomeData = {
      // num: this.server.sockets.adapter.rooms.get(roomName).size,
      num: 10,
      roomName,
    };
    this.server.to(roomName).emit('welcome', welcomeData);
  }
}
