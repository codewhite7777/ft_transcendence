import { Controller, Get, Redirect, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  async AuthLogic(@Req() req: any): Promise<void> {
    //42 Resource 서버에 인트라 아이디 정보 요청

    //42 Resource 서버에서 인증된 AccessToken값 응답 확인
    const accessToken: string = req.user;

    //42 Server에 client & AccessToken을 사용하여 API 호출
    const intraData = await this.authService.getIntraData(accessToken);
    //client intraID를 DB 조회
    const result = await this.userService.findUser(intraData['login']);
    if (result == null) {
      //신규 생성
      await this.userService.createUser(
        intraData['login'],
        intraData['email'],
        intraData['image']['link'],
      );
    } else {
      //DB에 기존 데이터 존재
      //TODO: 리다이렉트 주소(클라이언트 메인 페이지), 사용자 정보 값, 세션 키 값을 클라이언트에게 전달
      const userData = await this.userService.findUser(intraData['login']);
      console.log('==================');
      console.log(userData);
    }
    return;
  }
}
