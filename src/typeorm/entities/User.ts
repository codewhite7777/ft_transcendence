import {
  Column,
  Entity,
  Index,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Channel } from './Channel';
import { Channelinfo } from './Channelinfo';
import { Friendlist } from './Friendlist';
import { Matchhistory } from './Matchhistory';
import { Userblacklist } from './Userblacklist';

@Index('User_pkey2', ['id'], { unique: true })
@Entity('User', { schema: 'public' })
export class User {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'intraid', length: 50 })
  intraid: string;

  @Column('character varying', { name: 'avatar', nullable: true, length: 1000 })
  avatar: string | null;

  //added
  @Column('character varying', {
    name: 'nickname',
    nullable: true,
    length: 100,
  })
  nickname: string | null;

  @Column('integer', { name: 'rating' })
  rating: number;

  @Column('integer', { name: 'wincount', default: () => '0' })
  wincount: number;

  @Column('integer', { name: 'losecount', default: () => '0' })
  losecount: number;

  @Column('character varying', { name: 'email', length: 50 })
  email: string;

  @Column('boolean', { name: 'isotp', default: () => 'false' })
  isotp: boolean;

  @OneToMany(() => Channel, (channel) => channel.owner)
  channels: Channel[];

  @ManyToMany(() => Channel, (channel) => channel.users2) // ?
  channels2: Channel[];

  @OneToMany(() => Channelinfo, (channelinfo) => channelinfo.user)
  channelinfos: Channelinfo[];

  @OneToMany(() => Friendlist, (friendlist) => friendlist.userId)
  friendlists: Friendlist[];

  @OneToMany(() => Friendlist, (friendlist) => friendlist.userId3)
  friendlists2: Friendlist[];

  @OneToMany(() => Matchhistory, (matchhistory) => matchhistory.loser)
  matchhistories: Matchhistory[];

  @OneToMany(() => Matchhistory, (matchhistory) => matchhistory.winner)
  matchhistories2: Matchhistory[];

  @OneToMany(() => Userblacklist, (userblacklist) => userblacklist.userId)
  userblacklists: Userblacklist[];

  @OneToMany(() => Userblacklist, (userblacklist) => userblacklist.userId3)
  userblacklists2: Userblacklist[];
}
