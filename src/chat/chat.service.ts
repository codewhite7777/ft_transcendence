import { Inject, Injectable } from '@nestjs/common';
import { Channel } from '../typeorm/entities/Channel';
import { Channelinfo } from '../typeorm/entities/Channelinfo';
import { User } from '../typeorm/entities/User';
import { Repository } from 'typeorm';
import { channelBlacklist } from 'src/typeorm/entities/ChannelBlacklist';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ChatService {
  constructor(
    @Inject('CHANNEL_REPOSITORY')
    private channelRepository: Repository<Channel>,
    @Inject('CHANNELINFO_REPOSITORY')
    private channelInfoRepository: Repository<Channelinfo>,
    @Inject('CHANNELBLACKLIST_REPOSITORY')
    private channelBlacklistRepository: Repository<channelBlacklist>,
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>,
  ) {}

  // create channel(종류, ownner, 제목, 비번)
  async createChannel(
    kind: number,
    owner: number,
    roomname: string,
    roomPassword?: string,
  ) {
    console.log(`[Service] ${kind}, ${owner}, ${roomname}, ${roomPassword}`);
    if (
      !(
        (await this.channelRepository.findOne({ where: { roomname } })) ==
        undefined
      )
    )
      throw Error('Room Already Exist');
    const newChannel = this.channelRepository.create();
    newChannel.kind = kind;
    newChannel.owner = await this.userRepository.findOne({
      where: { id: owner },
    });
    newChannel.roomname = roomname;
    newChannel.users = [];
    newChannel.channelinfos = [];
    if (roomPassword !== undefined)
      newChannel.roompassword = await this.encryptPassword(roomPassword);
    return this.channelRepository.save(newChannel);
  }

  // read channel
  async getAllChannel() {
    return this.channelRepository.find({
      relations: { owner: true },
      select: {
        owner: { intraid: true },
      },
    });
  }
  async getChannelByKind(kind: number) {
    return this.channelRepository.find({
      where: { kind },
      relations: { owner: true },
    });
  }
  async getChannelById(id: number) {
    return this.channelRepository.findOneBy({ id });
  }
  async getChannelByName(roomname: string) {
    return this.channelRepository.findOne({
      where: { roomname },
      relations: { channelinfos: true, owner: true },
    });
  }

  async getChannelInfoByUser(userId: number) {
    return this.channelInfoRepository.find({
      where: { userid: userId },
      relations: { ch: true },
    });
  }

  // update channel -> 무엇을 바꾸느냐에 따라 함수를 쪼개야 할듯...
  async updateChannel(
    channel: Channel,
    kind: number,
    owner: number,
    roomName: string,
    roomPassword: string,
  ) {
    channel.kind = kind;
    channel.owner = await this.userRepository.findOne({
      where: { id: owner },
    });
    channel.roomname = roomName;
    channel.roompassword = roomPassword;
    return this.channelRepository.save(channel);
  }
  // 비밀번호 암호화 로직을 넣어야 함...!
  async updatePassword(channel: Channel, password: string) {
    channel.roompassword = await this.encryptPassword(password);
    return this.channelRepository.save(channel);
  }
  async updateKind(channel: Channel, kind: number) {
    channel.kind = kind;
    return this.channelRepository.save(channel);
  }

  // delete channel
  async deleteChannel(channel: Channel) {
    //const ret = this.channelRepository.delete(channel);
    const ret = this.channelRepository.remove(channel);
    console.log(ret); // 결과값에 따라 삭제되었는지 안삭제되었는지 판단하여 반환할것.
  }

  async deleteChannelById(channelId: number) {
    const ret = this.channelRepository.delete(channelId);
    console.log(ret); // 결과값에 따라 삭제되었는지 안삭제되었는지 판단하여 반환할것.
  }

  // join channel(누가, 어디채팅방에 참여한다)
  async joinChannel(
    channel: Channel,
    user: User,
    isOwner: boolean,
    isAdmin: boolean,
  ) {
    const newChannelinfos = this.channelInfoRepository.create();
    newChannelinfos.chid = channel.id;
    newChannelinfos.userid = user.id;
    newChannelinfos.isowner = isOwner;
    newChannelinfos.isadmin = isAdmin;
    // newChannelinfos를 save하지 않아도 괜찮은걸까? => save안하면 db에서 발견이 되지 않는다...
    await this.channelInfoRepository.save(newChannelinfos);
    channel.channelinfos.push(newChannelinfos);
    const updatedChannel = await this.channelRepository.save(channel);
    //console.log('updatedChannel: ', updatedChannel);
  }

  // left channel(누가, 어디채팅방에서 나간다)
  async leftChannel(channel: Channel, user: User) {
    if (channel.owner === user) {
      // throw error : 방장은 나갈 수 없습니다.
    }

    return this.channelInfoRepository.delete({
      chid: channel.id,
      userid: user.id,
    });
  }
  // delegate(채널에서 owner를 A에서 B로 위임한다.)
  async delegate(channel: Channel, user: User) {
    const channelInfo = await this.channelInfoRepository.findOne({
      where: { chid: channel.id, userid: user.id },
    });
    const channelInfo2 = await this.channelInfoRepository.findOne({
      where: { chid: channel.id, userid: channel.owner.id },
    });

    if (channelInfo.isowner) throw Error('이미 방장임');
    await this.changeRole(channelInfo, true, true);
    await this.changeRole(channelInfo2, false, false);
    const ret = await this.channelInfoRepository.save(channelInfo);
    const ret2 = await this.channelInfoRepository.save(channelInfo2);
    console.log('channelInfo update ret: ', ret, ret2);

    channel.owner = user;
    return this.channelRepository.save(channel);
  }
  // permisson(채널에서 A를 admin으로 임명한다.)
  async permission(ch: Channel, user: User) {
    const channelInfo = await this.channelInfoRepository.findOne({
      where: { chid: ch.id, userid: user.id },
    });
    console.log('channelInfo: ', channelInfo);

    if (channelInfo.isadmin) throw Error('이미 Admin임');
    return this.changeRole(channelInfo, channelInfo.isowner, true);
  }
  // revoke(채널에서 A의 admin 권한을 회수한다.)
  async revoke(ch: Channel, user: User) {
    const channelInfo = await this.channelInfoRepository.findOne({
      where: { chid: ch.id, userid: user.id },
    });

    if (!channelInfo.isadmin) throw Error('대상이 Admin이 아닙니다.');
    return this.changeRole(channelInfo, channelInfo.isowner, false);
  }

  async changeRole(
    channelInfo: Channelinfo,
    isOwner: boolean,
    isAdmin: boolean,
  ) {
    channelInfo.isowner = isOwner;
    channelInfo.isadmin = isAdmin;
    return await this.channelInfoRepository.save(channelInfo);
  }

  async isAdmin(ch: Channel, user: User) {
    const channelInfo = await this.channelInfoRepository.findOne({
      where: { chid: ch.id, userid: user.id },
    });
    return channelInfo.isadmin;
  }

  async isBanned(ch: Channel, user: User) {
    const channelBlacklist: channelBlacklist =
      await this.channelBlacklistRepository.findOne({
        where: { channelId: ch.id, userId: user.id },
      });

    return !(channelBlacklist === null);
  }

  async kick() {
    console.log('kick service');
  }
  async mute() {
    console.log('mute service');
  }
  async ban(ch: Channel, user: User) {
    console.log('ban service');

    const channelBlackList = await this.channelBlacklistRepository.create();
    channelBlackList.channelId = ch.id;
    channelBlackList.userId = user.id;
    const ret = this.channelBlacklistRepository.save(channelBlackList);
    // ret으로 잘 생성되었는지 확인한다.

    // socket상으로 막는다.
  }

  async encryptPassword(password: string) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }
}
