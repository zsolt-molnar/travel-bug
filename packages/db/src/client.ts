import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  return Object.assign(db, {
    $client: client,
  });
}

export type Database = ReturnType<typeof createDb>;
