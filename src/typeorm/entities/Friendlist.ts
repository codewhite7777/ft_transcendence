import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './User';

@Index('user_pkey2', ['userid', 'friendid'], { unique: true })
@Entity('friendlist', { schema: 'public' })
export class Friendlist {
  @PrimaryColumn('integer', { name: 'userid' })
  userId: number;

  @PrimaryColumn('integer', { name: 'friendid' })
  friendId: number;

  @ManyToOne(() => User, (user) => user.friendlists, {
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn([{ name: 'userid', referencedColumnName: 'id' }])
  user: User;

  @ManyToOne(() => User, (user) => user.friendlists2, {
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn([{ name: 'friendid', referencedColumnName: 'id' }])
  friend: User;
}
