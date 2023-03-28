import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getIntraData() {
    return 'ok';
  }
}
