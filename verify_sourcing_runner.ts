import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

async function verifySourcingRLS() {
  console.log('🚀 Starting PGlite Sourcing RLS Verification...');

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

      -- Mock auth.uid() to read from a session variable we can set
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
        SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text;
      $$ LANGUAGE sql STABLE;

      -- Grant usage so roles can access public schema
      GRANT USAGE ON SCHEMA public TO authenticated, anon;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon;

      -- Grant usage on auth schema and functions
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
      GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, anon;
    `);
    console.log('✅ Environment Setup (Roles + Auth Mock)');

    // 2. Load Core Schema
    // PGlite doesn't have the pgcrypto extension file available in the virtual FS by default.
    // However, gen_random_uuid() is built-in in Postgres 13+, so we don't strictly need pgcrypto for that.
    let schemaSql = fs.readFileSync('supabase/migrations/00001_core_schema.sql', 'utf8');
    schemaSql = schemaSql.replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/g, '-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await db.exec(schemaSql);
    console.log('✅ Core Schema Applied');

    // 2.1 Load Migration 00002
    let migration2 = fs.readFileSync('supabase/migrations/00002_fix_workspace_creation.sql', 'utf8');
    await db.exec(migration2);
    console.log('✅ Migration 00002 Applied');

    // 2.2 Load Migration 00003
    let migration3 = fs.readFileSync('supabase/migrations/00003_allow_user_insert.sql', 'utf8');
    await db.exec(migration3);
    console.log('✅ Migration 00003 Applied');

    // 2.3 Load Migration 00004 (SourcingTarget)
    let migration4 = fs.readFileSync('supabase/migrations/00004_sourcing_targets.sql', 'utf8');
    await db.exec(migration4);
    console.log('✅ Migration 00004 Applied');

    // 3. Setup Test Data (Workspace & User) as Superuser
    const WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';
    const USER_ID = 'aaaa1111-1111-1111-1111-111111111111';

    // We execute as superuser (default in PGlite unless SET ROLE is used)
    await db.exec(`
      INSERT INTO "Workspace" ("id", "workspaceType", "name")
      VALUES ('${WORKSPACE_ID}', 'SEARCHER', 'Test Workspace');

      INSERT INTO "User" ("id", "workspaceId", "role", "email", "firstName", "lastName")
      VALUES ('${USER_ID}', '${WORKSPACE_ID}', 'ADMIN', 'test@example.com', 'Test', 'User');
    `);
    console.log('✅ Test Data (Workspace + User) Inserted');

    // 4. Run Verification Script as Authenticated User
    // We switch role and set the user ID claim
    // We wrap this in a transaction or just execute commands.
    // verify_sourcing_rls.sql is a DO block, so it runs atomically.

    // We need to set the config in the same session.
    // db.exec runs in the same session if we don't close it? PGlite is single connection usually.

    await db.exec(`
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', '${USER_ID}', false);
    `);
    console.log('✅ Switched to Authenticated Role');

    const verifySql = fs.readFileSync('verify_sourcing_rls.sql', 'utf8');
    await db.exec(verifySql);
    console.log('✅ Sourcing RLS Verification Script Passed!');

  } catch (error: any) {
    console.error('❌ Verification Failed:', error);
    if (error.message) console.error('Message:', error.message);
    // If it's a "new row violates row-level security policy" error that wasn't caught inside SQL,
    // it means the script failed unexpectedly (since the script catches the expected one).
    process.exit(1);
  }
}

verifySourcingRLS();
