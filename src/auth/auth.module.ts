import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { BasicStrategy } from './strategies/basic.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BasicStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
