import {
  Controller,
  NotFoundException,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createWriteStream } from 'fs';
import UploadsService from './uploads.service';
import { UserService } from 'src/user/user.service';
import { CookieService } from 'src/cookie/cookie.service';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('/uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly userService: UserService,
    private readonly cookieService: CookieService,
  ) {}

  //{
  //  "file":!@#$%^&*^%$#@!$%^&...
  //}
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
		const configService = new ConfigService();
    console.log('파일 업로드 파트 시작');
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    console.log('쿠키 : ', cookie);
    console.log('--------------');
    this.userService.printSession();
    console.log('--------------');
    const target = this.userService.getIntraID(cookie);
    console.log('타겟 : ', target);
    const fileRet = await this.uploadsService.saveFile(file);
    const userData = await this.userService.findUser(target);
    console.log('target User');
    console.log(userData);
    const fileDir = `/uploads/${file.originalname}`;
    const isFileExist = await this.uploadsService.isLocalFileExist(userData);
    console.log(`로컬 파일 저장 여부 : ${isFileExist}`);
    if (isFileExist) await this.uploadsService.deleteFile(userData.avatar);
    //const fullPath = 'http://localhost:3000' + fileDir; // 수정된 코드
    const fullPath = `${configService.get<string>('BACKEND_URL')}${fileDir}`; // 수정된 코드
    await this.userService.updateURL(userData.intraid, fullPath); // 수정된 코드
    const updatedUserData = await this.userService.findUser(target);
    const localPath = updatedUserData.avatar; // 수정된 코드
    return { message: '파일이 저장되었습니다.', url: localPath };
  }
}
