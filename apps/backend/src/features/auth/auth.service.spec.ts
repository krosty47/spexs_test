import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TRPCError } from '@trpc/server';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '$2b$12$hashedpassword',
  role: 'USER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: DeepMockProxy<PrismaClient>;
  let _jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn().mockReturnValue({ sub: 'user-1' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret-that-is-at-least-32-chars',
                JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars',
                JWT_EXPIRATION: '1h',
                COOKIE_DOMAIN: 'localhost',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    _jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should return tokens when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UNAUTHORIZED when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notfound@example.com', password: 'password123' }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.login({ email: 'notfound@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('should throw UNAUTHORIZED when password is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('register', () => {
    it('should create user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should throw CONFLICT when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          name: 'Test',
          password: 'password123',
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.register({
          email: 'test@example.com',
          name: 'Test',
          password: 'password123',
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });
});
