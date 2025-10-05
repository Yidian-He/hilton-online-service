import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReservationsModule } from './reservations/reservations.module';
import { GlobalBasicAuthGuard } from './auth/guards/global-basic-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || '', {
      onConnectionCreate: (connection: Connection) => {
        connection.on('connected', () => console.log('MongoDB Connected'));
        connection.on('disconnected', () => console.log('MongoDB Disconnected'));
        connection.on('reconnected', () => console.log('MongoDB Reconnected'));
        connection.on('close', () => console.log('MongoDB Connection Closed'));
        return connection;
      },
    }),

    AuthModule,
    UsersModule,
    ReservationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: GlobalBasicAuthGuard,
    },
  ],
})
export class AppModule {}
