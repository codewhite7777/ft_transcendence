import { Userblacklist } from 'src/typeorm/entities/Userblacklist';
import { DataSource } from 'typeorm';

export const userblacklistProviders = [
  {
    provide: 'USERBLACKLIST_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(Userblacklist),
    inject: ['DATA_SOURCE'],
  },
];
