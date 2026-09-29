import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createDb, type Database } from '@travel-bug/db';

config({ path: resolve(__dirname, '../../../../.env') });

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly db: Database;
  private readonly clientClose?: () => Promise<void>;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is required');
    }
    this.db = createDb(url);
  }

  async onModuleDestroy() {
    // postgres.js clients exit with process; no explicit close required for POC
  }
}
