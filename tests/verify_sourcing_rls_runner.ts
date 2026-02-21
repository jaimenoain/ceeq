import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

async function run() {
  const db = new PGlite();

  console.log("Initializing database...");

  // 1. Mock auth schema and function BEFORE loading migrations that might reference it
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$ LANGUAGE sql;
  `);

  // 2. Load migrations
  let migration1 = fs.readFileSync("supabase/migrations/00001_core_schema.sql", "utf8");
  // Remove pgcrypto extension creation for PGlite if it fails (pglite might not have the extension files, but has built-in gen_random_uuid)
  migration1 = migration1.replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  const migration4 = fs.readFileSync("supabase/migrations/00004_sourcing_targets.sql", "utf8");

  try {
    await db.exec(migration1);
    await db.exec(migration4);
    console.log("Migrations applied.");
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }

  // 3. Seed Data
  const workspaceId = "00000000-0000-0000-0000-000000000001";
  const userId = "00000000-0000-0000-0000-000000000002";

  try {
    await db.exec(`
        INSERT INTO "Workspace" ("id", "workspaceType", "name", "subscriptionPlan")
        VALUES ('${workspaceId}', 'SEARCHER', 'Test Workspace', 'FREE');

        INSERT INTO "User" ("id", "workspaceId", "role", "email", "firstName", "lastName")
        VALUES ('${userId}', '${workspaceId}', 'ADMIN', 'test@example.com', 'Test', 'User');
    `);
    console.log("Seed data inserted.");
  } catch (e) {
    console.error("Seeding failed:", e);
    process.exit(1);
  }

  // 4. Set Auth Context
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${userId}', false);`);

  console.log("Running verification script...");

  const verifyScript = fs.readFileSync("verify_sourcing_rls.sql", "utf8");

  try {
    await db.exec(verifyScript);
    console.log("Verification script executed successfully.");
  } catch (e: any) {
    console.error("Verification failed:", e);
    process.exit(1);
  }
}

run();
