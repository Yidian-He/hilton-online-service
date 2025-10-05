import { Controller, Post, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BasicAuthGuard } from './guards/basic-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(BasicAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return {
      authenticated: true,
      message: 'Basic authentication successful'
    };
  }

  @UseGuards(BasicAuthGuard)
  @Post('validate')
  async validateCredentials(@Request() req) {
    return {
      valid: true,
      authenticated: true,
      message: 'Basic authentication successful'
    };
  }
}
