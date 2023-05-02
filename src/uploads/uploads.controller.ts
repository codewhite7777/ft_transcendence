import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createWriteStream } from 'fs';

@Controller('/uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const writeStream = createWriteStream(`./uploads/${file.originalname}`);
    const fileDir = `./uploads/${file.originalname}`;
    writeStream.write(file.buffer);
    writeStream.end();
    console.log(fileDir);
    return { message: '파일이 저장되었습니다.' };
  }
}
