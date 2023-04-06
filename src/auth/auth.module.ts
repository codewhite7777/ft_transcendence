import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database.module';
import { userProviders } from 'src/user/user.providers';
import { UserService } from 'src/user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FTStrategy } from './ft_strategy';

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, FTStrategy, UserService, ...userProviders],
})
export class AuthModule {}
