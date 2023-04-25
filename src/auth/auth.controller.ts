import {
  Controller,
  Get,
  NotAcceptableException,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { MailService } from 'src/mail/mail.service';
import { OtpService } from 'src/otp/otp.service';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { FTAuthGuard } from './ft_auth_guard';

@UseGuards(FTAuthGuard)
@Controller('/auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private userService: UserService,
    private mailService: MailService,
    private optService: OtpService,
  ) {}

  @Get()
  async AuthLogic(@Req() req: any, @Res() res: Response) {
    let redirectURL = 'http://localhost:3001/a'; //main page url
    //42 Resource 서버에 인트라 아이디 정보 요청

    //42 Resource 서버에서 인증된 AccessToken값 응답 확인
    const accessToken: string = req.user;

    //42 Server에 client & AccessToken을 사용하여 API 호출
    const intraData = await this.authService.getIntraData(accessToken);

    //client intraID를 DB 조회
    let result = await this.userService.findUser(intraData['login']);
    let firstFlag = false;
    if (result == null) {
      //신규 생성
      result = await this.userService.createUser(
        intraData['login'],
        intraData['email'],
        intraData['image']['link'],
      );
      firstFlag = true;
    }

    //세션 중복 확인
    if (this.userService.getSession(intraData['login']) != undefined) {
      throw new NotAcceptableException('Session already connected');
    }

    //otp 미 사용자 처리
    if (result.isotp == false) {
      //세션 키 생성 및 저장
      const sessionData = this.userService.createSession(intraData['login']);
      //for debug
      console.log(`otp 미 사용자 세션 생성`);
      console.log(`session Key : ${sessionData.key}`);
      console.log(`session User : ${sessionData.name}`);
      // console.log(`User ID : ${result.id}`);
      // console.log(`User email : ${result.email}`);
      // console.log(`User win : ${result.wincount}`);
      // console.log(`User lose : ${result.losecount}`);
      // console.log(`User opt : ${result.isotp}`);
      //쿠키 값 전달
      res.cookie('session_key', sessionData.key);
      if (firstFlag == true) {
        //intraID 쿠키 값 설정
        res.cookie('nickname', result.intraid);

        //리디렉션 join 설정
        redirectURL = 'http://localhost:3001/join';
      }
    } else {
      //for debug
      console.log(`otp 사용자 세션 미 생성`);
      console.log(`이메일 발송`);
      //기존 Otp 키 삭제
      this.optService.deleteOptKey(this.optService.getOptKey(result.intraid));

      //Otp 키 생성
      const optKey = this.optService.createOptKey(result.intraid);

      //이메일 Otp 키 전송
      await this.mailService.sendEmail(result.email, optKey);

      //email 쿠키 값 설정
      res.cookie('email', result.email);

      //리디렉션 otp 설정
      redirectURL = 'http://localhost:3001/otp';
    }
    res.redirect(redirectURL);
    return;
  }
}
