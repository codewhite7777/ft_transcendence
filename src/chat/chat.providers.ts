import { Channel } from 'src/typeorm/entities/Channel';
import { Channelinfo } from 'src/typeorm/entities/Channelinfo';
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
];
