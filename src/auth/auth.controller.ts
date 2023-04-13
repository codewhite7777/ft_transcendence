import {
  Controller,
  Get,
  Inject,
  NotAcceptableException,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { User } from 'src/typeorm/entities/User';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { FTAuthGuard } from './ft_auth_guard';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private userService: UserService,
  ) {}

  @Get()
  @UseGuards(FTAuthGuard)
  @Redirect('http://localhost:3000') //Redirection URL
  async AuthLogic(@Req() req: any, @Res() res: Response): Promise<void> {
    //42 Resource 서버에 인트라 아이디 정보 요청

    //42 Resource 서버에서 인증된 AccessToken값 응답 확인
    const accessToken: string = req.user;

    //42 Server에 client & AccessToken을 사용하여 API 호출
    const intraData = await this.authService.getIntraData(accessToken);

    //client intraID를 DB 조회
    let result = await this.userService.findUser(intraData['login']);
    if (result == null) {
      //신규 생성
      result = await this.userService.createUser(
        intraData['login'],
        intraData['email'],
        intraData['image']['link'],
      );
    }

    //세션 중복 확인
    if (this.userService.getSession(intraData['login']) != undefined) {
      throw new NotAcceptableException('Session already connected');
    }

    //otp 미 사용자 처리
    if (result.isotp == false) {
      //세션 키 생성 및 저장
      const sessionData = this.userService.createSession(intraData['login']);
      //debug
      console.log(`session Key : ${sessionData.key}`);
      console.log(`session User : ${sessionData.name}`);
      // console.log(`User ID : ${result.id}`);
      // console.log(`User email : ${result.email}`);
      // console.log(`User win : ${result.wincount}`);
      // console.log(`User lose : ${result.losecount}`);
      // console.log(`User opt : ${result.isotp}`);
      //쿠키 값 전달
      res.cookie('session_key', sessionData.key);
    } else {
        
    }

    return;
  }
}
