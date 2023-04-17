import { Injectable } from '@nestjs/common';

type cookieType = string | undefined;

@Injectable()
export class CookieService {
  extractCookie(cookieRaw: string): cookieType {
    if (cookieRaw == undefined) return undefined;
    return cookieRaw;
  }
}
