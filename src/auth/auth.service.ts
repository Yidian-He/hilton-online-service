import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor() {}

  // Authentication is handled by BasicAuthGuard and BasicStrategy
}
