import { Inject, Injectable } from '@nestjs/common';
import { Matchhistory } from 'src/typeorm/entities/Matchhistory';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';

@Injectable()
export class MatchhistoryService {
  constructor(
    @Inject('MATCHHISTORY_REPOSITORY')
    private matchHistoryRepository: Repository<Matchhistory>,
    private userService: UserService,
  ) {}

  //매치 히스토리 반환
  async getMatchHistory(myID: number) {
    const userData = await this.userService.findUserByID(myID);
    const matchList = await this.matchHistoryRepository.find({
      relations: { loser: true, winner: true },
      where: [{ winner: { id: userData.id } }, { loser: { id: userData.id } }],
      order: { id: 'DESC' },
      take: 5,
    });
    return matchList;
  }

  //매치 히스토리 생성
  async createMatchHistory(
    status: number,
    mapnumber: number,
    winscore: number,
    losescore: number,
    winnerid: number,
    loserid: number,
  ) {
    const matchHistory = await this.matchHistoryRepository.create();
    matchHistory.status = status;
    matchHistory.mapnumber = mapnumber;
    matchHistory.winscore = winscore;
    matchHistory.losescore = losescore;
    matchHistory.winner = await this.userService.findUserByID(winnerid);
    matchHistory.loser = await this.userService.findUserByID(loserid);
    return this.matchHistoryRepository.save(matchHistory);
  }

  //매치 히스토리 삭제 - no use
  // async deleteMatchHistory(myID:number, winHistroy: boolean, loseHistory: boolean){
  //   if (winHistroy)
  //   {
  //       const winData = await this.matchHistoryRepository.find({
  //           where: {winnerid: myID}
  //       });
  //       if (winData == null || myID == undefined)
  //           return false;
  //       const winResult = await this.matchHistoryRepository.delete(winData);
  //       if (winResult.affected == 0)
  //           return false;
  //   }
  //   if (loseHistory)
  //   {
  //       const loseData = await this.matchHistoryRepository.find({
  //           where: {loserid: myID}
  //       });
  //       if (loseData == null || myID == undefined)
  //           return false;
  //       const loseResult = await this.matchHistoryRepository.delete(loseData);
  //       if (loseResult.affected == 0)
  //           return false;
  //   }
  //   return true;
  // }

  //vaild - no use
  // async vaildDataType(gameData: any): Promise<boolean> {
  //   if (gameData['winnerid'] == undefined || gameData['loserid'] == undefined || gameData['status'] == undefined || gameData['mapnumber'] == undefined || gameData['winscore'] == undefined || gameData['losescore'] == undefined)
  //     return false;
  //   console.log(`위너 : ${gameData['winnerid']}`);
  //   console.log(`루저 : ${gameData['loserid']}`);
  //   const winnerUser = await this.userService.findUser(gameData['winnerid']);
  //   const loserUser = await this.userService.findUser(gameData['loserid']);
  //   console.log(winnerUser);
  //   if (winnerUser == null || loserUser == null)
  //     return false;
  //   return true;
  // }
}
