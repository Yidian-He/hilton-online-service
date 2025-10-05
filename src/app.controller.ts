import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): boolean {
    return true;
  }

  @Get('/healthcheck')
  async healthcheck(): Promise<string> {
    return this.appService.getHello();
  }
}
