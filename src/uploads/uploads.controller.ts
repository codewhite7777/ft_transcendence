import { Controller, NotFoundException, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createWriteStream } from 'fs';
import UploadsService from './uploads.service';
import { UserService } from 'src/user/user.service';
import { CookieService } from 'src/cookie/cookie.service';
import { Request } from 'express';

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
  async uploadFile(@UploadedFile() file: Express.Multer.File,  @Req() req: Request) {
    const cookie = this.cookieService.extractCookie(req.cookies['session_key']);
    if (cookie == undefined) throw new NotFoundException('cookie not found');
    const target = this.userService.getIntraID(cookie);
    const fileRet = await this.uploadsService.saveFile(file);
    const userData = await this.userService.findUser(target);
    // console.log(`userData.avatar : ${userData.avatar}`);
    const fileDir = `/uploads/${file.originalname}`;
    const isFileExist = await this.uploadsService.isLocalFileExist(userData);
    console.log(`로컬 파일 저장 여부 : ${isFileExist}`);
    if (isFileExist)
        await this.uploadsService.deleteFile(userData.avatar);
    await this.userService.updateURL(userData.intraid, fileDir);
    const localPath = 'http://localhost:3000' + userData.avatar;
    return { message: '파일이 저장되었습니다.', url : localPath };
  }
}
