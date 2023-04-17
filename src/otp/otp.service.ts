import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { v1 as uuid } from 'uuid';

@Injectable()
export class OtpService {
  private optArr: { [key: string]: string }[] = [];

  constructor(private readonly userService: UserService) {}
  createOptKey(intraID: string): string {
    let otpKey: string = uuid();
    otpKey = otpKey.slice(0, 5);
    const newOpt = { key: otpKey, name: intraID };
    this.optArr.push(newOpt);
    return otpKey;
  }

  getOptArr() {
    console.log(this.optArr);
  }
}
