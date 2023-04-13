import { Inject, Injectable, Req } from '@nestjs/common';
import { Friendlist } from 'src/typeorm/entities/Friendlist';
import { User } from 'src/typeorm/entities/User';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';

@Injectable()
export class FriendService {
  constructor(
    @Inject('FRIEND_REPOSITORY') private friendRepository: Repository<Friendlist>,
    private userService: UserService
  ) {}

  // CRUD
  // C : 친구 목록을 생성하지말고 추가하자.
  // R : 친구 목록 조회
  // U : 친구 목록 수정 -> 필요없을 듯 하다.
  // D : 친구 목록에서 일부 삭제

  // 친구 추가
  addFriend(user1: number, user2: number): Promise<Friendlist> {
    const friendlist: Friendlist = this.friendRepository.create();
    friendlist.userId = user1;
    friendlist.friendId = user2;
    return this.friendRepository.save(friendlist);
  }

  // 친구 정보 삭제
  async deleteFriend(user1: number, user2: number) {
    // const friendlist = await this.friendRepository.find({
    //   where: {
    //     userId1: user1,
    //     userId2: user2,
    //   }
    // });
    // console.log('friendlist: ', friendlist);
    return await this.friendRepository.delete({
      userId: user1,
      friendId: user2,
    });
  }

  // 친구 정보 조회
  async getFriendByNickname(intraID: string): Promise<Friendlist[]> {
    const user: User = await this.userService.findUser(intraID);

    return await this.friendRepository.find({ where: { userId: user.id }});
  }

  async getFriendById(userId: number): Promise<Friendlist[]> {
    return await this.friendRepository.find({ where: { userId }});
  }
}
