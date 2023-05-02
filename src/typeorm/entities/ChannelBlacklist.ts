import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Index('channelBlacklist_pkey3', ['channelId', 'userId'], { unique: true })
@Entity('channelBlacklist', { schema: 'public' })
export class channelBlacklist {
  @Column('integer', { primary: true, name: 'channelId' })
  channelId: number;

  @Column('integer', { primary: true, name: 'userId' })
  userId: number;
}
