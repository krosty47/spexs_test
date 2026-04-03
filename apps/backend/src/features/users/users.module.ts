import { Module } from '@nestjs/common';
import { UsersRouter } from './users.router';
import { UsersService } from './users.service';

@Module({
  providers: [UsersRouter, UsersService],
})
export class UsersModule {}
