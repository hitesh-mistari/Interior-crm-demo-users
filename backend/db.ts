import { Pool } from 'pg';
import type { PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('Missing DATABASE_URL environment variable');
    }

    // simplistic check: if not localhost/127.0.0.1, assume remote => enable SSL
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: Number(process.env.PG_CONNECTION_LIMIT || 10),
      idleTimeoutMillis: 60000,
      allowExitOnIdle: false,
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await getPool().query(sql, params);
  return res.rows as T[];
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function queryClient<T = any>(client: PoolClient, sql: string, params: any[] = []): Promise<T[]> {
  const res = await client.query(sql, params);
  return res.rows as T[];
}