import { channelBlacklist } from 'src/typeorm/entities/ChannelBlacklist';
import { DataSource } from 'typeorm';

export const channelBlacklistProviders = [
  {
    provide: 'CHANNELBLACKLIST_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(channelBlacklist),
    inject: ['DATA_SOURCE'],
  },
];
