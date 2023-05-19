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

//@UseGuards(FTAuthGuard)
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
    //let redirectURL = 'http://localhost:3001/'; //main page url
    let redirectURL = this.configService.get<string>('FRONTEND_URL'); //main page url

    //42 Resource 서버에 인트라 아이디 정보 요청

    //const accessToken: string = req.user;
    const authorizationCode = req.query.code;

    //42 Resource 서버에서 인증된 AccessToken값 응답 확인
    //console.log('req.user: ', req.user);
    const accessToken = await this.authService.getAccessToken(
      authorizationCode,
    );
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
    // 이미 해당 세션에 대한 데이터가 존재할 경우, 진행을 거부한다.
    const storedSession = this.userService.getSession(intraData['login']);
    console.log('storedSession: ', storedSession);
    if (storedSession != undefined) {
      throw new NotAcceptableException('Session already connected');
    }

    //otp 미 사용자 처리
    if (result.isotp == false) {
      //세션 키 생성 및 저장
      const sessionData = this.userService.createSession(intraData['login']);
      //for debug
      console.log(`otp 미 사용자 세션 생성`);
      console.log(`create session Key: ${sessionData.key}`);
      console.log(`create session User : ${sessionData.name}`);
      //쿠키 값 전달
      res.cookie('session_key', sessionData.key);
      res.cookie('nickname', result.intraid);
      res.cookie('userData', JSON.stringify(result));
      //리디렉션 join 설정 asdasdfasdfa
      //if (firstFlag == true) redirectURL = 'http://localhost:3001/join';
      if (firstFlag == true)
        redirectURL = `${this.configService.get('FRONTEND_URL')}/join`;
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
      //redirectURL = 'http://localhost:3001/otp';
      redirectURL = `${this.configService.get('FRONTEND_URL')}/otp`;
    }
    res.redirect(redirectURL);
    return;
  }

  @Get('/login')
  login(@Res() res: Response) {
    // Redirect users to the OAuth2 provider's authorization page
    const authorizationURL = `https://api.intra.42.fr/oauth/authorize?client_id=${this.configService.get<string>(
      'CLIENT_UID',
    )}&redirect_uri=${this.configService.get<string>(
      'REDIRECT_URL',
    )}&response_type=code`;
    res.redirect(authorizationURL);
  }

  // Debug End Point
  @UseGuards(FTAuthGuard)
  @Get('/gshim')
  gshimFunction() {
    return 'gshim';
  }
  @Get('/alee')
  aleeFunction() {
    return 'alee';
  }
}
