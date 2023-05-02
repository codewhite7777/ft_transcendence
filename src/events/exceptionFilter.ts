import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { EventResponse } from './eventResponse.interface';
import { Socket } from 'socket.io';

// @Catch(BadRequestException)
// export class ParameterValidationExceptionFilter implements ExceptionFilter {
//   catch(exception: BadRequestException, host: ArgumentsHost) {
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse<Response>();
//     const status = exception.getStatus();
//     const message = exception.message;
//     console.log('ParameterValidationExceptionFilter');
//   }
// }

@Catch(BadRequestException)
export class SocketParameterValidationExceptionFilter
  implements ExceptionFilter
{
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const socket = host.switchToHttp().getResponse<Socket>();
    const errorResponse = {
      statusCode: exception.getStatus(),
      message: exception.message,
    };
    console.log('ExceptionFilter , socket: ', socket);
    socket.emit('createChannel', { message: 'gshim은 방제로 쓸수없어용' });
    //return 'hello';
  }
}
