import {
  Controller,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { OtpService } from './otp.service';
import { Response } from 'express';

@Controller('/otp')
export class OtpController {
  constructor(
    private readonly optService: OtpService,
    private readonly userService: UserService,
  ) {}
  // {
  //     "otp_key":"42Seoul"
  // }
  @Post()
  async confirmOpt(@Req() req: any, @Res() res: Response): Promise<void> {
    console.log('이메일 인증에 관한 로직 시작');
    console.log(this.optService.getOptArr());

    //Otp 키 추출
    const reqOptKey = req['body']['otp_key'];
    console.log('키 추출값');
    console.log(reqOptKey);
    if (reqOptKey == undefined)
      throw new ForbiddenException('access forbidden');

    //Otp 값으로 요청 클라이언트 아이디 찾기
    const intraID = this.optService.getOptUser(reqOptKey);
    if (intraID == undefined)
      throw new InternalServerErrorException('no match found.');

    //Otp 키 제거
    this.optService.deleteOptKey(reqOptKey);

    //세션 키 생성 및 저장
    const sessionData = this.userService.createSession(intraID);

    //쿠키 값 전달
    res.cookie('session_key', sessionData.key);

    //반환 값 변경 (쿠키 값 설정 시, 300번 default 반환)
    res.status(201).send();
    return;
  }
}
