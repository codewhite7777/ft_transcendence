import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/typeorm/entities/User';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY') private userRepository: Repository<User>,
  ) {}

  //모든 유저 찾기
  async findAllUser(): Promise<User[]> {
    return this.userRepository.find();
  }

  //유저 찾기
  async findUser(intraID: string): Promise<User> {
    return this.userRepository.findOne({ where: { intraid: intraID } });
  }

  //유저 생성
  async createUser(
    intraID: string,
    email: string,
    avatarURL: string,
  ): Promise<User> {
    const user = this.userRepository.create();
    user.intraid = intraID;
    user.avatar = avatarURL;
    user.isotp = false;
    user.email = email;
    user.wincount = 0;
    user.losecount = 0;
    user.rating = 1200;
    return this.userRepository.save(user);
  }

  //유저 삭제
  async deleteUser(intraID: string): Promise<boolean> {
    const userData = await this.findUser(intraID);
    if (userData == null || intraID == undefined) return false;
    const delResult = await this.userRepository.delete(userData.id);
    if (delResult.affected == 0) return false;
    return true;
  }

  //게임 결과 업데이트
  async updateResult(intraID: string, result): Promise<boolean> {
    const userData = await this.findUser(intraID);
    if (userData == null || intraID == undefined) {
      return false;
    }
    if (result.win) {
      await this.userRepository.increment({ id: userData.id }, 'wincount', 1);
      await this.userRepository.increment({ id: userData.id }, 'rating', 1);
    }
    if (result.lose) {
      await this.userRepository.increment({ id: userData.id }, 'losecount', 1);
      await this.userRepository.increment({ id: userData.id }, 'rating', -1);
    }
    return true;
  }

  //email 설정 업데이트
  async updateEmail(intraID: string, email: string): Promise<boolean> {
    const userData = await this.findUser(intraID);
    if (userData == null || intraID == undefined) return false;
    userData.email = email;
    await this.userRepository.save(userData);
    return true;
  }

  //Opt 설정 업데이트
  async updateOpt(intraID: string, Opt: boolean): Promise<boolean> {
    const userData = await this.findUser(intraID);
    if (userData == null || intraID == undefined) return false;
    userData.isotp = Opt;
    await this.userRepository.save(userData);
    return true;
  }

  //Avatar URL 업데이트
  async updateURL(intraID: string, url: string): Promise<boolean> {
    const userData = await this.findUser(intraID);
    if (userData == null || intraID == undefined) return false;
    userData.avatar = url;
    await this.userRepository.save(userData);
    return true;
  }
}
