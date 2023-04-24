import { Injectable, Inject } from '@nestjs/common';
import { Friendlist } from 'src/typeorm/entities/Friendlist';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';

@Injectable()
export class FriendlistService {
  constructor(
    @Inject('FRIENDLIST_REPOSITORY')
    private friendRepository: Repository<Friendlist>,
    private userService: UserService,
  ) {}

  //프랜드 리스트 반환
  async getFriendList(myID: number) {
    const myFriendList: string[] = [];

    const friendList = await this.friendRepository.find({
      where: { userId1: myID },
    });
    const ret = friendList.map((elem) => elem.userId2);
    for (let i = 0; i < ret.length; i++) {
      const friendData = await this.userService.findUserByID(ret[i]);
      myFriendList.push(friendData.intraid);
    }
    return myFriendList;
  }

  //프랜드 리스트 생성
  async createFriendList(myID: number, friendID: number): Promise<Friendlist> {
    const friendList = await this.friendRepository.create();
    friendList.userId1 = myID;
    friendList.userId2 = friendID;
    return this.friendRepository.save(friendList);
  }

  //프랜드 리스트 삭제
  async deleteFriendList(myID: number, friendID: number): Promise<boolean> {
    const friendListData = await this.friendRepository.findOne({
      where: { userId1: myID, userId2: friendID },
    });
    if (friendListData == null || myID == undefined || friendID == undefined)
      return false;
    const delResult = await this.friendRepository.delete(friendListData);
    if (delResult.affected == 0) return false;
    return true;
  }
}
