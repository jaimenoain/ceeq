import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

async function verifyRLS() {
  console.log('🚀 Starting PGlite RLS Verification...');

  const db = new PGlite();

  try {
    // 1. Setup Mock Environment (Roles + Auth Functions)
    await db.exec(`
      -- Ensure roles exist for Supabase emulation
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN NOINHERIT;
        END IF;
      END $$;

      -- Setup auth schema functions typically provided by Supabase/GoTrue
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
        SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text;
      $$ LANGUAGE sql STABLE;

      -- Grant usage so roles can access public schema
      GRANT USAGE ON SCHEMA public TO authenticated, anon;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon;
    `);
    console.log('✅ Environment Setup (Roles + Auth Mock)');

    // 2. Load Core Schema
    let schemaSql = fs.readFileSync('supabase/migrations/00001_core_schema.sql', 'utf8');

    // PGlite doesn't have the pgcrypto extension file available in the virtual FS by default.
    // However, gen_random_uuid() is built-in in Postgres 13+, so we don't strictly need pgcrypto for that.
    // We comment out the extension creation to avoid the error.
    schemaSql = schemaSql.replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/g, '-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await db.exec(schemaSql);
    console.log('✅ Core Schema Applied');

    // 3. Run Verification Script
    const verifySql = fs.readFileSync('verify_rls.sql', 'utf8');
    await db.exec(verifySql);
    console.log('✅ RLS Verification Script Passed!');

  } catch (error: any) {
    console.error('❌ Verification Failed:', error);
    if (error.message) console.error('Message:', error.message);
    process.exit(1);
  }
}

verifyRLS();
