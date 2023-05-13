import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UserService } from '../user/user.service';

@Injectable()
export class SocketAuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('This is SocketAuthGuard!');

    const socket: Socket = context.switchToWs().getClient();
    const session_key = socket.handshake.headers.session_key;
    const intraId = socket.handshake.headers.intraid as string;

    if (session_key === undefined || intraId === undefined) return false;

    // console.log('my session_key: ', session_key);
    // console.log('stored session_key: ', session_key);
    const isAuthorized: boolean =
      session_key === this.userService.getSession(intraId); // Check if token is present in the socket handshake
    if (!isAuthorized) {
      console.log('❌ not authenticated!');
      socket.emit('auth_error', { message: 'Unauthorized access' });
      return false;
    }

    // If the user is not authenticated,
    console.log('✅ authenticated!');
    return true;
  }
}
