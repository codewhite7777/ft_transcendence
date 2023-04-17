import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { v1 as uuid } from 'uuid';

@Injectable()
export class OtpService {
  private optArr: { [key: string]: string }[] = [];

  constructor(private readonly userService: UserService) {}

  //Opt 키 생성 및 저장
  createOptKey(intraID: string): string {
    let otpKey: string = uuid();
    otpKey = otpKey.slice(0, 5);
    const newOpt = { key: otpKey, name: intraID };
    this.optArr.push(newOpt);
    return otpKey;
  }

  //Otp 키를 통해 유저 찾기
  getOptUser(optKey: string): string | undefined {
    const result = this.optArr.find((item) => item.key == optKey);
    return result ? result.name : undefined;
  }

  //유저 이름을 통해 Otp 키 찾기
  getOptKey(intraID: string): string | undefined {
    const result = this.optArr.find((item) => item.name == intraID);
    return result ? result.key : undefined;
  }

  //Otp 키 삭제
  deleteOptKey(optKey: string): void {
    this.optArr = this.optArr.filter((item) => item.key != optKey);
    return;
  }

  //Otp 키 출력
  getOptArr() {
    console.log(this.optArr);
  }
}
