jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {
    sign(payload: unknown) {
      return `signed:${JSON.stringify(payload)}`;
    }
  },
}));

import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { AuthService } from './auth.service';
import { DbService } from '../db/db.service';

describe('AuthService', () => {
  const jwt = new JwtService({});

  function mockDb(overrides: { selectResult?: unknown[]; insertResult?: unknown[] }) {
    const chain: Record<string, jest.Mock> = {};
    const self = () => chain;
    chain.select = jest.fn(self);
    chain.from = jest.fn(self);
    chain.where = jest.fn(self);
    chain.limit = jest.fn(async () => overrides.selectResult ?? []);
    chain.insert = jest.fn(self);
    chain.values = jest.fn(self);
    chain.returning = jest.fn(async () => overrides.insertResult ?? []);
    chain.update = jest.fn(self);
    chain.set = jest.fn(self);
    return { db: chain } as unknown as DbService;
  }

  it('login rejects missing user', async () => {
    const db = mockDb({ selectResult: [] });
    const auth = new AuthService(db, jwt);
    await expect(
      auth.login({ email: 'x@y.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login rejects bad password', async () => {
    const db = mockDb({
      selectResult: [
        {
          id: '1',
          email: 'solo@travelbug.demo',
          role: 'traveler',
          operatorId: null,
          passwordHash: hashSync('password123', 8),
        },
      ],
    });
    const auth = new AuthService(db, jwt);
    await expect(
      auth.login({ email: 'solo@travelbug.demo', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login returns JWT claims on success', async () => {
    const user = {
      id: '00000000-0000-4000-8000-000000000014',
      email: 'solo@travelbug.demo',
      role: 'traveler',
      operatorId: null,
      passwordHash: hashSync('password123', 8),
    };
    const db = mockDb({ selectResult: [user] });
    const auth = new AuthService(db, jwt);
    const result = await auth.login({
      email: 'solo@travelbug.demo',
      password: 'password123',
    });
    expect(result.accessToken).toContain('signed:');
    expect(result.user.email).toBe('solo@travelbug.demo');
    expect(result.accessToken).toContain(user.id);
  });

  it('signup rejects duplicate email', async () => {
    const db = mockDb({
      selectResult: [{ id: '1', email: 'a@b.com' }],
    });
    const auth = new AuthService(db, jwt);
    await expect(
      auth.signup({
        email: 'a@b.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
