import { DataSource } from 'typeorm';
import { Channel } from './typeorm/entities/Channel';
import { Channelinfo } from './typeorm/entities/Channelinfo';
import { Friendlist } from './typeorm/entities/Friendlist';
import { Matchhistory } from './typeorm/entities/Matchhistory';
import { User } from './typeorm/entities/User';
import { Userblacklist } from './typeorm/entities/Userblacklist';

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      const dataSource = new DataSource({
        name: 'default',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: '1234',
        database: 'ft_db',
        synchronize: true,
        //entities: [__dirname + '/**/*.entity{.ts,.js}', User],
        entities: [
          User,
          Channel,
          Channelinfo,
          Friendlist,
          Matchhistory,
          Userblacklist,
        ],
      });
      return dataSource.initialize();
    },
  },
];
