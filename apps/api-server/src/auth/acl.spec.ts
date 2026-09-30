import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { assertTripAccess, assertTripWriteAccess, gemVisibilitySql } from './acl';
import type { RequestIdentity } from './identity';
import type { Database } from '@travel-bug/db';

describe('gemVisibilitySql', () => {
  it('returns a SQL fragment for public-only when operatorId is null', () => {
    expect(gemVisibilitySql(null)).toBeDefined();
  });

  it('returns a SQL fragment for public OR operator match', () => {
    expect(gemVisibilitySql('00000000-0000-4000-8000-000000000001')).toBeDefined();
  });
});

describe('assertTripAccess', () => {
  const traveler: RequestIdentity = {
    userId: 'traveler-1',
    email: 't@test.com',
    role: 'traveler',
    operatorId: null,
  };

  function tripDb(
    trip: {
      id: string;
      userId: string;
      operatorId: string | null;
    },
    partyUserId?: string,
  ) {
    const chain: Record<string, jest.Mock> = {};
    const self = () => chain;
    let selectCall = 0;
    chain.select = jest.fn(self);
    chain.from = jest.fn(self);
    chain.where = jest.fn(self);
    chain.limit = jest.fn(async () => {
      selectCall += 1;
      if (selectCall === 1) return [trip];
      if (partyUserId === traveler.userId) {
        return [{ tripId: trip.id, userId: traveler.userId }];
      }
      return [];
    });
    return { db: chain as unknown as Database };
  }

  it('allows trip owner', async () => {
    const { db } = tripDb({
      id: 'trip-1',
      userId: traveler.userId,
      operatorId: null,
    });
    await expect(assertTripAccess(db, traveler, 'trip-1')).resolves.toMatchObject({
      id: 'trip-1',
    });
  });

  it('forbids unrelated traveler', async () => {
    const { db } = tripDb({
      id: 'trip-1',
      userId: 'other',
      operatorId: null,
    });
    await expect(assertTripAccess(db, traveler, 'trip-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('superadmin can access any trip', async () => {
    const { db } = tripDb({
      id: 'trip-1',
      userId: 'other',
      operatorId: 'op-1',
    });
    const admin: RequestIdentity = {
      userId: 'admin',
      email: 'a@test.com',
      role: 'superadmin',
      operatorId: null,
    };
    await expect(assertTripAccess(db, admin, 'trip-1')).resolves.toBeTruthy();
  });

  it('throws when trip missing', async () => {
    const chain: Record<string, jest.Mock> = {};
    const self = () => chain;
    chain.select = jest.fn(self);
    chain.from = jest.fn(self);
    chain.where = jest.fn(self);
    chain.limit = jest.fn(async () => []);
    await expect(
      assertTripAccess(chain as unknown as Database, traveler, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('assertTripWriteAccess', () => {
  const traveler: RequestIdentity = {
    userId: 'traveler-1',
    email: 't@test.com',
    role: 'traveler',
    operatorId: null,
  };

  function tripDb(trip: { id: string; userId: string; operatorId: string | null }) {
    const chain: Record<string, jest.Mock> = {};
    const self = () => chain;
    chain.select = jest.fn(self);
    chain.from = jest.fn(self);
    chain.where = jest.fn(self);
    chain.limit = jest.fn(async () => [trip]);
    return { db: chain as unknown as Database };
  }

  it('allows traveler writes on personal trips', async () => {
    const { db } = tripDb({
      id: 'trip-1',
      userId: traveler.userId,
      operatorId: null,
    });
    await expect(assertTripWriteAccess(db, traveler, 'trip-1')).resolves.toMatchObject({
      id: 'trip-1',
    });
  });

  it('forbids traveler writes on agency trips', async () => {
    const { db } = tripDb({
      id: 'trip-1',
      userId: traveler.userId,
      operatorId: 'op-1',
    });
    await expect(assertTripWriteAccess(db, traveler, 'trip-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
