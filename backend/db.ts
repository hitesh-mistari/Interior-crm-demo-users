import { Pool } from 'pg';
import type { PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const host = process.env.PGHOST;
    const user = process.env.PGUSER;
    const password = process.env.PGPASSWORD;
    const database = process.env.PGDATABASE;
    const port = Number(process.env.PGPORT || 5432);

    if (!host || !user || !password || !database) {
      throw new Error('Missing PostgreSQL environment variables');
    }

    pool = new Pool({
      host,
      user,
      password,
      database,
      port,
      ssl: (process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : undefined,
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