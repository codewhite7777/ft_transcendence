import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { FTAuthGuard } from './ft_auth_guard';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @UseGuards(FTAuthGuard)
  async AuthLogic(@Req() req: any) {
    const accessToken: string = req.user;

    //1. accessToken으로 42Resource 서버에 인트라 아이디 정보 요청
    const intraData = await this.authService.getIntraData(accessToken);

    //debug
    console.log(intraData['login']);

    //2. 42Resource 서버에서 전달받은 데이터를 임시 저장 (추후 DB에 데이터 생성할 때 사용)

    //3. DB 연결

    //4. TypeORM을 통해 DB 연결

    //5. DB 조회 (유저가 존재하면 이전 DB정보 로드, 존재하지 않으면 신규 생성)

    //6. 리다이렉트 주소(클라이언트 메인 페이지), 세션 키 값을 클라이언트에게 전달

    //7. 이후 클라이언트는 JWT값과 함께 필요한 정보를 요청함 (유저의 게임정보 데이터)

    return 'auth';
  }
}
