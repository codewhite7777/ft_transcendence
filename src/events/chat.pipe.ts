import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class CreateChannelValidationPipe implements PipeTransform {
  transform(value: any): any {
    console.log('CreateChannelValidationPipe: ', value);
    const { kind, roomName } = value;
    if (roomName === 'gshim') {
      console.log('throw error');
      throw new BadRequestException(
        'Parameter error: 그 이름은 사용할수없다구?',
      );
    }
    if (kind === undefined || roomName === undefined) {
      throw new BadRequestException(
        'Parameter error: kind and roomName are required.',
      );
    }
    return value;
  }
}
