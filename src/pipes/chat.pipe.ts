import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ChatService } from 'src/chat/chat.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class CreateChannelValidationPipe implements PipeTransform {
  transform(value: any): any {
    console.log('CreateChannelValidationPipe: ', value);
    const { kind, roomName, roomPassword } = value;
    if (kind === undefined || roomName === undefined || roomName.length < 1) {
      console.log('throw error');
      throw new BadRequestException(
        'Parameter error: kind or roomName is required',
      );
    }
    if (kind === 1 && (roomName === undefined || roomName.length < 1)) {
      throw new BadRequestException('Parameter error: password is required.');
    }
    return value;
  }
}

@Injectable()
export class ChannelValidationPipe implements PipeTransform {
  transform(value: any): any {
    const { userId, roomName, user, channel, clientUser } = value;
    if (userId === undefined || roomName === undefined) {
      throw new BadRequestException(
        'Parameter error: userId and roomName are required.',
      );
    }

    return { userId, roomName, user, channel, clientUser };
  }
}

@Injectable()
export class SocketValidationPipe implements PipeTransform {
  transform(value: any): any {
    console.log('SocketValidationPipe: ', value);
    //const { userId, roomName } = value;
    const socketUserId: number = parseInt(
      value?.handshake?.headers?.userid,
      10,
    );
    if (socketUserId === undefined) {
      throw new BadRequestException(
        "Parameter error: There's no userId in your socket",
      );
    }
    value.socketId = socketUserId;
    return value;
  }
}
