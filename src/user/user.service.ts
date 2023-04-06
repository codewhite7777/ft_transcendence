import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/typeorm/entities/User';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY') private userRepository: Repository<User>,
  ) {}

  async findAllUser(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findUser(intraID: string): Promise<User> {
    return this.userRepository.findOne({ where: { intraid: intraID } });
  }

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
    console.log(user);
    return this.userRepository.save(user);
  }

  async deleteUser(intraID: string): Promise<boolean> {
    const userData = await this.findUser(intraID);
    if (userData == null) return false;
    const delResult = await this.userRepository.delete(userData.id);
    if (delResult.affected == 0) return false;
    return true;
  }
}
