import { Friendlist } from 'src/typeorm/entities/Friendlist';
import { DataSource } from 'typeorm';

export const friendlistProviders = [
  {
    provide: 'FRIENDLIST_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(Friendlist),
    inject: ['DATA_SOURCE'],
  },
];
