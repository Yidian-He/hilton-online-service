import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // Create logger instance
  const logger = new Logger('Bootstrap');

  // Create the application with logging enabled
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
 