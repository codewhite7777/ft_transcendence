import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createWriteStream } from 'fs';
import UploadsService from './uploads.service';
import { UserService } from 'src/user/user.service';
import { CookieService } from 'src/cookie/cookie.service';

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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const fileRet = await this.uploadsService.saveFile(file);
    const userData = await this.userService.findUser('hena');//TODO : 쿠키 값으로 유저 찾기
    // console.log(`userData.avatar : ${userData.avatar}`);
    const fileDir = `./uploads/${file.originalname}`;
    const isFileExist = this.uploadsService.isLocalFileExist(userData);
    // console.log(`파일 저장 여부 : ${isFileExist}`);
    if (isFileExist)
        await this.uploadsService.deleteFile(userData.avatar);
    await this.userService.updateURL(userData.intraid, fileDir);
    return { message: '파일이 저장되었습니다.' };
  }
}
