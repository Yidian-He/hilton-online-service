import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BasicStrategy } from '../auth/strategies/basic.strategy';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    describe('BasicStrategy Authentication', () => {
    it('should validate correct credentials', async () => {
      // Mock environment variables
      process.env.BASIC_AUTH_USERNAME = 'testuser';
      process.env.BASIC_AUTH_PASSWORD = 'testpass';
      
      // Create a real BasicStrategy instance for this test
      const realBasicStrategy = new BasicStrategy();
      
      const result = await realBasicStrategy.validate('testuser', 'testpass');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for empty auth credentials', async () => {
      const realBasicStrategy = new BasicStrategy();
      
      await expect(
        realBasicStrategy.validate('', '')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong username', async () => {
      process.env.BASIC_AUTH_USERNAME = 'testuser';
      process.env.BASIC_AUTH_PASSWORD = 'testpass';
      
      const realBasicStrategy = new BasicStrategy();
      
      await expect(
        realBasicStrategy.validate('wronguser', 'testpass')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      process.env.BASIC_AUTH_USERNAME = 'testuser';
      process.env.BASIC_AUTH_PASSWORD = 'testpass';
      
      const realBasicStrategy = new BasicStrategy();
      
      await expect(
        realBasicStrategy.validate('testuser', 'wrongpass')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for both wrong credentials', async () => {
      process.env.BASIC_AUTH_USERNAME = 'testuser';
      process.env.BASIC_AUTH_PASSWORD = 'testpass';
      
      const realBasicStrategy = new BasicStrategy();
      
      await expect(
        realBasicStrategy.validate('wronguser', 'wrongpass')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
