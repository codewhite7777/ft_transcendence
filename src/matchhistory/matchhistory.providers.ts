import { Matchhistory } from 'src/typeorm/entities/Matchhistory';
import { DataSource } from 'typeorm';

export const matchhistoryProviders = [
  {
    provide: 'MATCHHISTORY_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(Matchhistory),
    inject: ['DATA_SOURCE'],
  },
];
