import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy as Strategy } from 'passport-http';

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super();
  }

  async validate(username: string, password: string): Promise<boolean> {
    // Basic auth credentials for API protection
    const validUsername = process.env.BASIC_AUTH_USERNAME || 'username';
    const validPassword = process.env.BASIC_AUTH_PASSWORD || 'password';

    if (username === validUsername && password === validPassword) {
      return true;
    }
    
    throw new UnauthorizedException('Invalid basic auth credentials');
  }
}
