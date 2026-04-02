import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

async function run() {
  const databaseUrl = process.env.DATABASE_URL_INTERNAL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('[DB_BOOTSTRAP] DATABASE_URL_INTERNAL/DATABASE_URL missing. Skipping PostgreSQL bootstrap.');
    return;
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(currentDir, '..', '..');
  const schemaPath = path.join(repoRoot, 'packages', 'db', 'schema.sql');

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log('[DB_BOOTSTRAP] PostgreSQL connection verified with SELECT 1.');

    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('[DB_BOOTSTRAP] Base SQL schema applied from packages/db/schema.sql.');
  } catch (error) {
    console.error('[DB_BOOTSTRAP] Failed to bootstrap PostgreSQL schema:', error);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

run().catch((error) => {
  console.error('[DB_BOOTSTRAP] Fatal error:', error);
  process.exit(1);
});
