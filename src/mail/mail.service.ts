import { MailerService } from '@nestjs-modules/mailer';
import { ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendHello(): Promise<boolean> {
    await this.mailerService.sendMail({
      to: 'showbiz1013@naver.com',
      from: 'noreplay@gmail.com',
      subject: 'Hello',
      text: 'Hello World',
      html: '<b>Hello World</b>',
    });
    return true;
  }
}
