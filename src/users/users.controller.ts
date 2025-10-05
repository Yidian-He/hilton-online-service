import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
