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
import { randomBytes } from 'crypto';
import { map } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { MatchhistoryService } from 'src/matchhistory/matchhistory.service';
import { UserService } from 'src/user/user.service';
import { UserstatusService } from 'src/userstatus/userstatus.service';
import {
  GameData,
  BallObject,
  PlayerObject,
  SocketInfo,
  ExitStatus,
  MapStatus,
  QueueObject,
  createBallObject,
  createLeftPlayerObject,
  createRightPlayerObject,
  createGameData,
  createGameType,
  createQueueObject,
} from './game.interface';
// 이 설정들이 뭘하는건지, 애초에 무슨 레포를 보고 이것들을 찾을 수 있는지 전혀 모르겠다.
@WebSocketGateway(8000, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
    credentials: true,
  },
}) // 무조건 만들어야 에러가 안나게 하는부분인가봄.
export default class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly matchhistoryService: MatchhistoryService,
    private readonly userService: UserService,
    private readonly userstatusService: UserstatusService) {}
  @WebSocketServer()
  server: Server;

  // Board Info ex) canvas, moveValue, MaxGoal
  private canvasW = 600;
  private canvasH = 400;
  private moveValue = 4;
  private maxGoalScore = 5;

  private gameRoom: { [key: string]: any } = {};

  // frame id
  private intervalIds = {};

  // Waiting Queue
  private matchNormalQueue = [];
  private matchExtendQueue = [];

  // [key: socketId, value: socketInfo{roomName, playerId}]
  private socketRoomMap = new Map<string, SocketInfo>();

  startGame(roomName: string) {
    function checkBallAndPaddleCollision(
      b: BallObject,
      p: PlayerObject,
    ): boolean {
      const [playerTop, playerBottom, playerLeft, playerRight] = [
        p.y,
        p.y + p.height,
        p.x,
        p.x + p.width,
      ];
      const [ballTop, ballBottom, ballLeft, ballRight] = [
        b.y - b.radius,
        b.y + b.radius,
        b.x - b.radius,
        b.x + b.radius,
      ];

      return (
        ballRight > playerLeft &&
        ballBottom > playerTop &&
        ballLeft < playerRight &&
        ballTop < playerBottom
      );
    }

    function checkBallAndWallCollision(
      gameObject: GameData,
      canvasHeight: number,
    ): boolean {
      return (
        gameObject.ball.y + gameObject.ball.radius > canvasHeight ||
        gameObject.ball.y - gameObject.ball.radius < 0
      );
    }

    function resetBall(ball: BallObject, w: number, h: number): void {
      // init ball position
      ball.x = w / 2;
      ball.y = h / 2;

      // init ball default speed
      ball.speed = 5;

      // reverse the original direction
      ball.velocityX = -ball.velocityX;
    }

    const setId = setInterval(async () => {
      const gameObject = this.gameRoom[roomName];

      gameObject.ball.x += gameObject.ball.velocityX;
      gameObject.ball.y += gameObject.ball.velocityY;

      if (checkBallAndWallCollision(gameObject, this.canvasH)) {
        // TODO
        gameObject.ball.velocityY = -gameObject.ball.velocityY;
      }
      const player =
        gameObject.ball.x < this.canvasW / 2
          ? gameObject.left
          : gameObject.right;

      if (checkBallAndPaddleCollision(gameObject.ball, player)) {
        let collidePoint = gameObject.ball.y - (player.y + player.height / 2);
        collidePoint = collidePoint / (player.height / 2);

        const angleRad = (collidePoint * Math.PI) / 4;
        const direction = gameObject.ball.x < this.canvasW / 2 ? 1 : -1;
        gameObject.ball.velocityX =
          direction * gameObject.ball.speed * Math.cos(angleRad);
        gameObject.ball.velocityY = gameObject.ball.speed * Math.sin(angleRad);

        gameObject.ball.speed += 0.1;
      }

      // update player left paddle
      if (gameObject.left.state == 1) {
        gameObject.left.y = Math.max(gameObject.left.y - this.moveValue, 0);
      } else if (gameObject.left.state == 2) {
        gameObject.left.y = Math.min(
          gameObject.left.y + this.moveValue,
          this.canvasH - gameObject.left.height,
        );
      }

      // update player right paddle
      if (gameObject.right.state == 1) {
        gameObject.right.y = Math.max(gameObject.right.y - this.moveValue, 0);
      } else if (gameObject.right.state == 2) {
        gameObject.right.y = Math.min(
          gameObject.right.y + this.moveValue,
          this.canvasH - gameObject.right.height,
        );
      }

      // update the score
      if (gameObject.ball.x - gameObject.ball.radius < 0) {
        gameObject.right.score++;
        resetBall(gameObject.ball, this.canvasW, this.canvasH);
      } else if (gameObject.ball.x + gameObject.ball.radius > this.canvasW) {
        gameObject.left.score++;
        resetBall(gameObject.ball, this.canvasW, this.canvasH);
      }
      this.server
        .to(roomName)
        .emit(
          'render',
          gameObject.left,
          gameObject.right,
          gameObject.ball,
          roomName,
        );

      // check GameOver and proceed over logic
      if (this.isGameOver(gameObject.left, gameObject.right, roomName)) {
        // stop interval and clear
        clearInterval(this.intervalIds[roomName]);
        delete this.intervalIds[roomName];

        // socketMap clear
        const remainClients = this.server.sockets.adapter.rooms.get(roomName);
        for (const key of remainClients) {
          this.socketRoomMap.delete(key);
        }

        const gameType = this.gameRoom[roomName].type.flag;
        const winner =
          gameObject.left.score > gameObject.right.score
            ? gameObject.left
            : gameObject.right;
        const loser =
          gameObject.left.score < gameObject.right.score
            ? gameObject.left
            : gameObject.right;
        const winScore = winner.score;
        const loseScore = loser.score;
        const winIntraId = winner.intraId;
        const loseIntraId = loser.intraId;

        //TODO : convert pk to intraID
        const winUser = await this.userService.findUser(winIntraId);
        const loseUser = await this.userService.findUser(loseIntraId);

        console.log("win user ", winUser);
        console.log("lose user ", loseUser);


        // console.log("state: graceful exit", "mapNumber:", gameType, winScore, loseScore, "id:", winId, loserId);
        console.log("ExitStatus.GRACEFUL_SHUTDOWN");
        console.log(
          ExitStatus.GRACEFUL_SHUTDOWN,
          gameType,
          winScore,
          loseScore,
          winUser.id,
          loseUser.id,
        );

        await this.matchhistoryService.createMatchHistory( ExitStatus.GRACEFUL_SHUTDOWN,
          gameType,
          winScore,
          loseScore,
          winUser.id,
          loseUser.id,
        );
        console.log('데이터 저장 완료');

        // Todo. 이거 필요함??
        // change user'status online Need Emit code
        this.userstatusService.setUserStatus(winUser.id, 'online');
        this.userstatusService.setUserStatus(loseUser.id, 'online');

        // remove socket room
        delete this.gameRoom[roomName];
        this.server.socketsLeave(roomName);
      }
    }, 20);

    // set Interval Id => if game end, need to clear setInterval
    this.intervalIds[roomName] = setId;
  }

  afterInit(server: Server) {
    console.log('WebSocketGateway initialized');
  }

  // 연결된 socket이 연결될때 동작하는 함수 - OnGatewayConnection 짝궁
  handleConnection(client: any, ...args: any[]) {
    const intraId = client.handshake.headers.intraid;
    const userId = client.handshake.headers.userid;

    // if connected, print socketid #debug code
    console.log(`Client connected!!! your socketid is: ${client.id}, myintraId:${intraId}, userId:${userId}`);

    // change user'status online Need Emit code
    // Todo. 이거필요함?
    this.userstatusService.setUserStatus(userId, 'online');

    // key[socketid] : value[original socket]
    this.sessionMap[intraId] = client;
  }

  // 연결된 socket이 끊어질때 동작하는 함수 - OnGatewayDisconnect 짝궁
  async handleDisconnect(client: any, ...args: any[]) {
    // Get roomName and PlayerId that the client belongs to.
    if (this.socketRoomMap.get(client.id) !== undefined) {
      const roomName = this.socketRoomMap.get(client.id).roomName;
      const playerId = this.socketRoomMap.get(client.id).playerId;

      // Delete client in socketRoomMap because of client leave our webPage
      this.socketRoomMap.delete(client.id);

      // only player 1 and 2 win
      if (playerId === 1 || playerId === 2) {
        let winScore, loseScore, winId, loserId;
        const gameObject = this.gameRoom[roomName];
        // player 2p win
        if (playerId === 1) {
          const winner = gameObject.right;
          const loser = gameObject.left;

          winScore = winner.score;
          loseScore = loser.score;
          winId = winner.nick;
          loserId = loser.nick;

          const responseMessage = {
            state: 200,
            message: 'Disconnect 2p Win',
            dataObject: { player: winner.nick },
          };
          this.server.to(roomName).emit('gameover', responseMessage);
        }
        // player 1p win
        else if (playerId === 2) {
          const winner = gameObject.left;
          const loser = gameObject.right;

          winScore = winner.score;
          loseScore = loser.score;
          winId = winner.nick;
          loserId = loser.nick;

          const responseMessage = {
            state: 200,
            message: 'Disconnect 1p Win',
            dataObject: { player: winner.nick },
          };
          this.server.to(roomName).emit('gameover', responseMessage);
        }

        // Stop Game
        clearInterval(this.intervalIds[roomName]);
        delete this.intervalIds[roomName];

        // socketRoomMap[roomName] all clear
        const remainClients = this.server.sockets.adapter.rooms.get(roomName);
        for (const key of remainClients) {
          this.socketRoomMap.delete(key);
        }

        // Processing Database
        // Alee's TODO
        // console.log(
        //   ExitStatus.CRASH,
        //   gameObject.type.flag,
        //   winScore,
        //   loseScore,
        //   winId,
        //   loserId,
        // );

        const winUser = await this.userService.findNickname(winId);
        const loseUser = await this.userService.findNickname(loserId);

        // console.log("state: graceful exit", "mapNumber:", gameType, winScore, loseScore, "id:", winId, loserId);
        console.log(
          ExitStatus.CRASH,
          gameObject.type.flag,
          winScore,
          loseScore,
          winId,
          loserId,
        );
        console.log(`winUser : ${winUser} ${winUser.id}`);
        console.log(`loseUser : ${loseUser} ${loseUser.id}`);

        await this.matchhistoryService.createMatchHistory( ExitStatus.CRASH,
          gameObject.type.flag,
          winScore,
          loseScore,
          winUser.id,
          loseUser.id,
        );

        // remove socket(real socket) room
        this.server.socketsLeave(roomName);
      }
    } else {
      console.log('undifined');
    }

    // const intraId = loseUser;
    // delete this.sessionMap[intraId]; // TODO 연결이 끊어질때 나의 닉네임을 보낼 수  있음?
  }

  // press Up key
  @SubscribeMessage('handleKeyPressUp')
  async handleKeyPressUp(@MessageBody() message) {
    const { roomName, id }: { roomName: string; id: number } = message;
    console.log(roomName, id);
    if (this.gameRoom[roomName] !== undefined)
    {
      if (id === 1) {
        this.gameRoom[roomName].left.state = 1;
      } else if (id === 2) {
        this.gameRoom[roomName].right.state = 1;
      }
    }
  }

  // press Down key
  @SubscribeMessage('handleKeyPressDown')
  async handleKeyPressDown( @MessageBody() message) {
    const { roomName, id }: { roomName: string; id: number } = message;
    console.log(roomName, id);
    if (this.gameRoom[roomName] !== undefined)
    {
      if (id === 1) {
        this.gameRoom[roomName].left.state = 2;
      } else if (id === 2) {
        this.gameRoom[roomName].right.state = 2;
      }
    }
  }

  // release Up Key
  @SubscribeMessage('handleKeyRelUp')
  async handleKeyRelUp(@MessageBody() message) {
    const { roomName, id }: { roomName: string; id: number } = message;
    if (this.gameRoom[roomName] !== undefined)
    {
      if (id === 1) {
        this.gameRoom[roomName].left.state = 0;
      } else if (id === 2) {
        this.gameRoom[roomName].right.state = 0;
      }
    }
  }

  // release Down Key
  @SubscribeMessage('handleKeyRelDown')
  async handleKeyRelDown(@MessageBody() message) {
    const { roomName, id }: { roomName: string; id: number } = message;
    console.log(roomName, id);
    if (this.gameRoom[roomName] !== undefined)
    {
      if (id === 1) {
        this.gameRoom[roomName].left.state = 0;
      } else if (id === 2) {
        this.gameRoom[roomName].right.state = 0;
      }
    }
  }

  // socket의 메시지를 room내부의 모든 이들에게 전달합니다.
  @SubscribeMessage('match')
  async enqueueMatch(@ConnectedSocket() client: Socket, @MessageBody() data) {
    // parameter {gametype, intraId}
    const { gameType, intraId, userId }: { gameType: MapStatus; intraId: string, userId:number } = data;
    console.log('my:nick', intraId, userId);

    // ############ Error logic ############
    // check invalid gameType
    if (gameType < 0 || gameType > 1) {
      this.server.to(client.id).emit('enqueuecomplete', 404);
      return;
    }

    // check invalid intraId
    if (intraId === undefined || intraId === '') {
      this.server.to(client.id).emit('enqueuecomplete', 404);
      return;
    }
    // ####################################

    // change user'status online Need Emit code
    this.userstatusService.setUserStatus(userId, 'in-queue');

    // create QueueObject
    const queueData: QueueObject = createQueueObject({
      socket: client,
      gameType,
      intraId: intraId,
    });

    // divide queue(normal, extend)
    if (gameType === 0) {
      this.matchNormalQueue.push(queueData);
    } else {
      this.matchExtendQueue.push(queueData);
    }

    this.server.to(client.id).emit('enqueuecomplete', 200);

    // dequeue data
    if (
      this.matchNormalQueue.length >= 2 ||
      this.matchExtendQueue.length >= 2
    ) {
      let left;
      let right;
      let gameType;
      if (this.matchNormalQueue.length >= 2) {
        left = this.matchNormalQueue.shift();
        right = this.matchNormalQueue.shift();
        gameType = 0;
      }

      if (this.matchExtendQueue.length >= 2) {
        left = this.matchExtendQueue.shift();
        right = this.matchExtendQueue.shift();
        gameType = 1;
      }

      const roomName = randomBytes(10).toString('hex');
      const newGameObject: GameData = createGameData(
        createLeftPlayerObject({ intraId: left.intraId }),
        createRightPlayerObject({ intraId: right.intraId }),
        createBallObject(),
        createGameType(gameType),
      );
      // intraId add part
      this.gameRoom[roomName] = newGameObject;
      left.socket.join(roomName); // TODO
      right.socket.join(roomName); // TODO

      const leftInfo: SocketInfo = { roomName, playerId: 1 };
      const rightInfo: SocketInfo = { roomName, playerId: 2 };
      this.socketRoomMap.set(left.socket.id, leftInfo);
      this.socketRoomMap.set(right.socket.id, rightInfo);

      // {state, message, dataObject {} }

      const leftUser = await this.userService.findUser(left.intraId);
      const rightUser = await this.userService.findUser(right.intraId);
      const responseMessage = {
        state: 200,
        message: "good in 'match'",
        dataObject: {
          leftUser,
          rightUser,
          // leftPlayerNick: left.intraId,
          // rightPlayerNick: right.intraId,

          leftSockId:left.socket.id,
          rightSockId:right.socket.id,
          roomName: roomName,
          gameType: gameType,
        },
      };
      // 이벤트를 발생시켜서,
      this.server.to(roomName).emit('matchingcomplete', responseMessage);

      // change user'status online Need Emit code
      this.userstatusService.setUserStatus(userId, 'in-game');

      console.log('matching 완료');
      this.startGame(roomName);
    }
  }

  isGameOver(
    left: PlayerObject,
    right: PlayerObject,
    roomName: string,
  ): boolean {
    if (left.score >= this.maxGoalScore || right.score >= this.maxGoalScore) {
      if (left.score >= this.maxGoalScore) {
        const responseMessage = {
          state: 200,
          message: 'Test',
          dataObject: { player: left.intraId },
        };
        this.server.to(roomName).emit('gameover', responseMessage); // TODO
      } else if (right.score >= this.maxGoalScore) {
        const responseMessage = {
          state: 200,
          message: 'Test',
          dataObject: { player: right.intraId },
        };
        this.server.to(roomName).emit('gameover', responseMessage); // TODO
      }
      return true;
    }
    return false;
  }

  // cancel queue event
  // param[socketId]
  @SubscribeMessage('cancel queue')
  async cancelQueue(@ConnectedSocket() client, @MessageBody() message)  {
    const {intraId} = message;

    // check 용도
    let isInQueueFlag: boolean = false;

    // travel normal queue
    for (var i = 0; i < this.matchNormalQueue.length; i++) {
      console.log(this.matchNormalQueue[i].socket.id, client.id);
      if (this.matchNormalQueue[i].socket.id === client.id) {
        this.matchNormalQueue.splice(i, 1);
        isInQueueFlag = true;
        break;
      }
    }

    // travel extend queue
    for (var i = 0; i < this.matchExtendQueue.length; i++) {
      if (this.matchExtendQueue[i].socket.id === client.id) {
        this.matchExtendQueue.splice(i, 1);
        isInQueueFlag = true;
        break;
      }
    }

    // call back 용 response message
    const responseMessage = {state: 0, message: ""};

    // Creating Messages Based on Results
    if (isInQueueFlag) {  // found in server Queue(normal or extend)
      // success
      responseMessage.state = 200;
      responseMessage.message = `client socket id ${client.id}가 발견되었습니다.`;

      // change user'status online Need Emit code
      const user = await this.userService.findUser(intraId);
      console.log("여긴가", user.id);
      this.userstatusService.setUserStatus(user.id, 'online');
    } else {              // not found Error
      // fail
      responseMessage.state = 404;
      responseMessage.message = `client socket id ${client.id}가 발견되지못했습니다. 문제를 해결하십시요. 휴먼`;
    }
    return responseMessage;
  }

  // sessionMap:[nick, socket]
  private sessionMap = {};
  @SubscribeMessage('Invite Game')
  async InviteGame(@ConnectedSocket() client, @MessageBody() data) {
    const {myIntraId, oppIntraId, gameType }: { myIntraId: string, oppIntraId: string, gameType: number } = data;

    // 1. Check if your opponent is online or offline
    const socketData = this.sessionMap[oppIntraId];
    if (socketData === undefined) {
      const responseMessage = {state: 404, message: "offline인 친구임. ㅅㄱ"};
      return responseMessage;
    }

    // 2. Check if your opponent is playing or spectating
    const oppUser = await this.userService.findUser(oppIntraId);
    this.userstatusService.setUserStatus(oppUser.id, 'online');
    if (this.userstatusService.getUserStatus(oppUser.id) === 'online') {
      const responseMessage = {state: 404, message: "game중인 친구임. ㅅㄱ"};
      return responseMessage;
    }

    // 3. return invite complete event
    const user = await this.userService.findUser(myIntraId);
    console.log(user);
    this.server.to(socketData.id).emit('invite message', {user:user, gameType});
    const responseMessage = {state: 200, message: "초대 성공하였음."};
    return responseMessage;
  }

  @SubscribeMessage('Accept invitation')
  async InviteOK(@ConnectedSocket() client, @MessageBody() data) {
    const { myIntraId, oppintraId,  gameType } = data;

    console.log("my data:", data);
    console.log("my IntraId:", myIntraId);
    console.log("opp IntraId:", oppintraId);
    console.log("gametype:", gameType);

    // 1. Check if your opponent is online or offline
    const socketData = this.sessionMap[oppintraId];
    console.log(socketData);
    if (socketData === undefined) {
      this.server.to(client.id).emit('invite fail');
      return;
    }

    // 2. Check if your opponent is playing or spectating
    if (socketData.state === 'in-game' || socketData.state === 'in-queue') {
      // TODO state change
      this.server.to(client.id).emit('invite fail');
      return;
    }
    // 3. return invite complete event
    // 3-1. remove my data in WaitingQueue
    if (socketData.state === 'in-queue') {
      for (var i = 0; i < this.matchNormalQueue.length; i++) {
        if (this.matchNormalQueue[i].socket.nickName === oppintraId) {
          this.matchNormalQueue.splice(i, 1);
          break;
        }
      }
      for (var i = 0; i < this.matchNormalQueue.length; i++) {
        if (this.matchExtendQueue[i].socket.nickName === oppintraId) {
          this.matchExtendQueue.splice(i, 1);
          break;
        }
      }
      this.server.to(client.id).emit('cancel queue complete', 200);
    }
    // 3-2. create room
    const roomName = randomBytes(10).toString('hex');

    // 3-3. create GameObject
    const newGameObject: GameData = createGameData(
      createLeftPlayerObject({ intraId: myIntraId }),
      createRightPlayerObject({ intraId: oppintraId }), // TODO
      createBallObject(),
      createGameType(gameType),
    );
    this.gameRoom[roomName] = newGameObject;

    // 3-4. join room
    client.join(roomName); // TODO
    socketData.join(roomName); // TODO

    const leftInfo: SocketInfo = { roomName, playerId: 1 };
    const rightInfo: SocketInfo = { roomName, playerId: 2 };
    this.socketRoomMap.set(client.id, leftInfo);
    this.socketRoomMap.set(socketData.id, rightInfo);

    // 3-5. both set id
    const leftUser = await this.userService.findUser(myIntraId);
    const rightUser = await this.userService.findUser(oppintraId);
    const responseMessage = {
      state: 200,
      message: "good in 'match'",
      dataObject: {
        leftUser,
        rightUser,
        leftSockId:client.id,
        rightSockId:this.sessionMap[rightUser.intraid].id,
        roomName: roomName,
        gameType: gameType,
      },
    };
    this.server.to(roomName).emit('matchingcomplete', responseMessage);

    this.userstatusService.setUserStatus(leftUser.id, 'in-game');
    this.userstatusService.setUserStatus(rightUser.id, 'in-game');

    this.startGame(roomName);

    // 3-6. send complete message
    this.server.to(client.id).emit('invite complete');
  }

  @SubscribeMessage('playerBackspace')// TODO
  async BackClick(@ConnectedSocket() client, @MessageBody() data) {
    const { roomName, nickName } = data;

    const gameObject = this.gameRoom[roomName];
    // 1p or 2p case
    if (
      nickName === gameObject.left.nick ||
      nickName === gameObject.right.nick
    ) {
      clearInterval(this.intervalIds[roomName]);
      delete this.intervalIds[roomName];

      // socketMap clear
      const remainClients = this.server.sockets.adapter.rooms.get(roomName);
      for (const key of remainClients) {
        this.socketRoomMap.delete(key);
      }

      const gameType: number = gameObject.type.flag;

      const winner: PlayerObject =
        data.left.nick !== nickName ? data.left : data.right;
      const loser: PlayerObject =
        data.left.nick === nickName ? data.left : data.right;
      const winScore: number = winner.score;
      const loseScore: number = loser.score;
      const winintraId: string = winner.intraId;
      const loserintraId: string = loser.intraId;

      const winUser = await this.userService.findNickname(winintraId);
      const loseUser = await this.userService.findNickname(loserintraId);

        // console.log("state: graceful exit", "mapNumber:", gameType, winScore, loseScore, "id:", winId, loserId);
      console.log(ExitStatus.CRASH, gameObject.type.flag, winScore, loseScore, winintraId, loserintraId);

        await this.matchhistoryService.createMatchHistory( ExitStatus.CRASH,
          gameObject.type.flag,
          winScore,
          loseScore,
          winUser.id,
          loseUser.id,
        );

      // remove socket room
      delete this.gameRoom[roomName];
      this.server.socketsLeave(roomName);

      const responseMessage = {
        state: 200,
        message: 'Test',
        dataObject: { player: winner.intraId },
      };
      this.server.to(roomName).emit('gameover', responseMessage);
    }
  }
}
