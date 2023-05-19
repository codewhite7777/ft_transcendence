// channel-validation.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from '../chat/chat.service';
import { UserService } from '../user/user.service';

// Todo.이름바꿀것.
@Injectable()
export class ChannelValidationInterceptor implements NestInterceptor {
  constructor(
    private chatService: ChatService,
    private userService: UserService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const data = context.switchToWs().getData();
    const { userId, roomName } = data;

    if (userId === undefined || roomName === undefined) {
      throw new BadRequestException(
        'Parameter error: userId and roomName are required.',
      );
    }
    const client = context.switchToWs().getClient();
    const socketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );

    if (!client.rooms.has(roomName)) {
      throw new BadRequestException(
        `Error: ${roomName} does not exist among the channels the client joined.`,
      );
    }

    const channel = await this.chatService.getChannelByName(roomName);
    if (channel === null)
      throw new BadRequestException(`Error: Unknown channel ${roomName}`);
    const user = await this.userService.findUserByID(userId);
    if (user === null) throw new BadRequestException(`Error: Unknown user.`);
    const clientUser = await this.userService.findUserByID(socketUserId);
    if (clientUser === null) {
      throw new BadRequestException(`Error: Unknown user.`);
    }

    data.user = user;
    data.channel = channel;
    data.clientUser = clientUser;
    return next.handle();
  }
}

@Injectable()
export class UserValidationInterceptor implements NestInterceptor {
  constructor(private userService: UserService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const data = context.switchToWs().getData();
    const { userId } = data;

    if (userId === undefined) {
      throw new BadRequestException('Parameter error: require userId');
    }

    const user = await this.userService.findUserByID(userId);
    if (user === null) throw new BadRequestException(`Error: Unknown user.`);

    data.user = user;
    return next.handle();
  }
}

// Todo.이름바꿀것.
@Injectable()
export class RoomValidationInterceptor implements NestInterceptor {
  constructor(
    private chatService: ChatService,
    private userService: UserService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const data = context.switchToWs().getData();
    const { roomName } = data;

    if (roomName === undefined || roomName.length < 1)
      throw new BadRequestException('Parameter error: require roomName');

    const channel = await this.chatService.getChannelByName(roomName);
    // Todo. DM인 경우가 있으니 우선 통과시키도록 작성하겠다.
    // if (channel === null)
    //   throw new BadRequestException(`Error: Unknown channel ${roomName}`);

    data.channel = channel;
    return next.handle();
  }
}

@Injectable()
export class ClientValidationInterceptor implements NestInterceptor {
  constructor(
    private chatService: ChatService,
    private userService: UserService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const data = context.switchToWs().getData();
    const client = context.switchToWs().getClient();
    const socketUserId: number = parseInt(
      client?.handshake?.headers?.userid,
      10,
    );

    const clientUser = await this.userService.findUserByID(socketUserId);
    if (clientUser === null) {
      throw new BadRequestException(`Error: Unknown user.`);
    }

    data.clientUser = clientUser;
    return next.handle();
  }
}
