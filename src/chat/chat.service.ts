import { Inject, Injectable } from '@nestjs/common';
import { Channel } from 'src/typeorm/entities/Channel';
import { Channelinfo } from 'src/typeorm/entities/Channelinfo';
import { User } from 'src/typeorm/entities/User';
import { Repository } from 'typeorm';

@Injectable()
export class ChatService {
  constructor(
    @Inject('CHANNEL_REPOSITORY')
    private channelRepository: Repository<Channel>,
    @Inject('CHANNELINFO_REPOSITORY')
    private channelInfoRepository: Repository<Channelinfo>,
    private userRepository: Repository<User>,
  ) {}

  // create channel(종류, ownner, 제목, 비번)
  async createChannel(
    kind: number,
    owner: number,
    roomName: string,
    roomPassword: string,
  ) {
    const newChannel = this.channelRepository.create();
    newChannel.kind = kind;
    newChannel.owner = await this.userRepository.findOne({
      where: { id: owner },
    });
    newChannel.roomname = roomName;
    newChannel.roompassword = this.encryptPassword(roomPassword);
    return this.channelRepository.save(newChannel);
  }

  // read channel
  async getAllChannel() {
    return this.channelRepository.find();
  }
  async getChannelByKind(kind: number) {
    return this.channelRepository.find({
      where: { kind },
    });
  }
  async getChannelById(id: number) {
    return this.channelRepository.findOneBy({ id });
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
    channel.roompassword = this.encryptPassword(password);
    return this.channelRepository.save(channel);
  }
  async updateKind(channel: Channel, kind: number) {
    channel.kind = kind;
    return this.channelRepository.save(channel);
  }

  // delete channel
  async deleteChannel(channel: Channel) {
    const ret = this.channelRepository.delete(channel);
  }

  // join channel(누가, 어디채팅방에 참여한다)
  async joinChannel(channel: Channel, user: User) {
    channel.users.push(user);
    this.channelRepository.save(channel);
  }
  async joinChannel2(channel: Channel, user: User) {
    const channelInfo = this.channelInfoRepository.create();
    channelInfo.ch = channel;
    channelInfo.user = user;
    return this.channelInfoRepository.save(channelInfo);
  }

  // left channel(누가, 어디채팅방에서 나간다)
  async leftChannel(channel: Channel, user: User) {
    if (channel.owner === user) {
      // throw error : 방장은 나갈 수 없습니다.
    }
    const index = channel.users.indexOf(user);
    if (index !== -1) {
      channel.users.splice(index, 1);
    } else {
      // throw error
    }
    return this.channelRepository.save(channel);
  }
  // delegate(채널에서 owner를 A에서 B로 위임한다.)
  async delegate(channel: Channel, user: User) {
    channel.owner = user;
    return this.channelRepository.save(channel);
  }
  // permisson(채널에서 A를 admin으로 임명한다.)
  async permisson(ch: Channel, user: User) {
    ch.users.push(user);
    return this.channelRepository.save(ch);
  }
  // revoke(채널에서 A의 admin 권한을 회수한다.)
  async revoke(ch: Channel, user: User) {
    const index = ch.users.indexOf(user);
    if (index !== -1) {
      ch.users.splice(index, 1);
    } else {
      // throw error
    }
    ch.users.push(user);
    return this.channelRepository.save(ch);
  }

  // 아직 아무것도 안했지만 여기서 암호화를 할것.
  encryptPassword(password: string) {
    return password;
  }
}
