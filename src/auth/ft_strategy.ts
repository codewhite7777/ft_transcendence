import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-42';

@Injectable()
export class FTStrategy extends PassportStrategy(Strategy, 'ft') {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: `https://api.intra.42.fr/oauth/authorize?client_id=${configService.get<string>(
        'CLIENT_UID',
      )}&redirect_uri=${configService.get<string>(
        'REDIRECT_URL',
      )}&response_type=code`,
      tokenURL: configService.get<string>('TOKEN_URL'),
      clientID: configService.get<string>('CLIENT_UID'),
      clientSecret: configService.get<string>('CLIENT_SECRET'),
      callbackURL: configService.get<string>('REDIRECT_URL'),
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    try {
      return accessToken;
    } catch (error) {
      console.log(`refreshToken : ${refreshToken}`);
      console.log(`profile : ${profile}`);
      console.log(error);
    }
  }
}
