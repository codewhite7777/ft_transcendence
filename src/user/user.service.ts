import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/typeorm/entities/User';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @Inject('USER_REPOSITORY') private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async create(): Promise<User> {
    const user = this.userRepository.create();
    user.intraid = 'gshim';
    user.isotp = false;
    user.email = "fuck";
    user.wincount = 0;
    user.losecount = 0;
    user.rating = 1200;
    
    console.log(user);
    return this.userRepository.save(user);
  }
}
