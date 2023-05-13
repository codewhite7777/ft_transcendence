import { channelBlacklist } from '../typeorm/entities/ChannelBlacklist';
import { Channel } from '../typeorm/entities/Channel';
import { Channelinfo } from '../typeorm/entities/Channelinfo';
import { DataSource } from 'typeorm';

export const chatProviders = [
  {
    provide: 'CHANNEL_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Channel),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'CHANNELINFO_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(Channelinfo),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'CHANNELBLACKLIST_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(channelBlacklist),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'FRIENDLIST_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(channelBlacklist),
    inject: ['DATA_SOURCE'],
  },
];
