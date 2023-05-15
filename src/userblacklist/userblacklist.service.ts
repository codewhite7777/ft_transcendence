import { Inject, Injectable } from '@nestjs/common';
import { Userblacklist } from 'src/typeorm/entities/Userblacklist';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class UserblacklistService {
  constructor(
    @Inject('USERBLACKLIST_REPOSITORY')
    private userblacklistRepository: Repository<Userblacklist>,
    private userService: UserService,
  ) {}

  //블랙 리스트 반환
  async getBlackList(myID: number) {
    const myBlackList: string[] = [];

    const friendList = await this.userblacklistRepository.find({
      where: { userId1: myID },
    });
    const ret = friendList.map((elem) => elem.userId2);
    for (let i = 0; i < ret.length; i++) {
      const friendData = await this.userService.findUserByID(ret[i]);
      myBlackList.push(friendData.intraid);
    }
    return myBlackList;
  }

  async getBlackListOne(userId1: number, userId2: number) {
    return await this.userblacklistRepository.count({
      where: { userId1, userId2 },
    });
  }

  //블랙 리스트 생성
  async createBlackList(
    myID: number,
    blacklistID: number,
  ): Promise<Userblacklist> {
    const blackList = await this.userblacklistRepository.create();
    blackList.userId1 = myID;
    blackList.userId2 = blacklistID;
    return this.userblacklistRepository.save(blackList);
  }

  //블랙 리스트 삭제
  async deleteBlackList(myID: number, blacklistID: number): Promise<boolean> {
    const blackListData = await this.userblacklistRepository.findOne({
      where: { userId1: myID, userId2: blacklistID },
    });
    if (blackListData == null || myID == undefined || blacklistID == undefined)
      return false;
    const delResult = await this.userblacklistRepository.delete(blackListData);
    if (delResult.affected == 0) return false;
    return true;
  }
}
