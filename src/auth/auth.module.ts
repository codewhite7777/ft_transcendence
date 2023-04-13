import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database.module';
import { UserModule } from 'src/user/user.module';
import { userProviders } from 'src/user/user.providers';
import { UserService } from 'src/user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FTStrategy } from './ft_strategy';

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule, UserModule],
  controllers: [AuthController],
  providers: [AuthService, FTStrategy],
})
export class AuthModule {}
