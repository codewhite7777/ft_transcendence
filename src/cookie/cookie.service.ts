import { Injectable } from '@nestjs/common';

type cookieType = string | undefined;

@Injectable()
export class CookieService {
  extractCookie(cookieRaw: string): cookieType {
    let cookie = cookieRaw.split('; ')[1];
    if (cookie == undefined) return undefined;
    if (cookie.startsWith('session_key=') == false) return undefined;
    cookie = cookie.split('=')[1];
    return cookie;
  }
}
