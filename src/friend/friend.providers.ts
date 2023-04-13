import { Friendlist } from 'src/typeorm/entities/Friendlist';
import { DataSource } from 'typeorm';

export const friendProviders = [
  {
    provide: 'FRIEND_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Friendlist),
    inject: ['DATA_SOURCE'],
  },
];
