import { MailerService } from '@nestjs-modules/mailer';
import { ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(email: string, optKey: string): Promise<void> {
    const result = await this.mailerService.sendMail({
      to: email,
      from: 'noreplay@gmail.com',
      subject: 'ft_transcendence 2차 OPT 인증입니다.',
      text: '',
      html: `<b>아래의 키를 입력하여 2차 OTP인증을 완료하세요.</b><br><br><br><b>${optKey}</b>`,
    });
    return;
  }
}
