import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BasicAuthGuard } from './basic-auth.guard';
import { Observable } from 'rxjs';

@Injectable()
export class GlobalBasicAuthGuard extends BasicAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Skip basic auth for guest endpoints, login endpoint and healthcheck
    if (request.url === '/auth/login' || 
        request.url.startsWith('/auth/login') ||
        request.url === '/healthcheck' ||
        request.url.startsWith('/healthcheck') ||
        request.url.startsWith('/reservations/guest/')) {
      return true;
    }
    
    // Apply basic auth to all other endpoints
    return super.canActivate(context);
  }
}
