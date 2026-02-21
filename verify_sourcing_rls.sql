-- verify_sourcing_rls.sql
-- Standalone verification script to test Tenant Isolation via RLS for SourcingTarget.
-- This script assumes the schema from 'supabase/migrations/00001_core_schema.sql' is applied.
-- It acts as TDD: it creates the SourcingTarget table and policies temporarily to verify them.

BEGIN;

-------------------------------------------------------------------------------
-- 0. Schema Setup (Temporary for Verification)
-------------------------------------------------------------------------------

-- Create Table
CREATE TABLE IF NOT EXISTS "SourcingTarget" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" uuid NOT NULL,
  "domain" text NOT NULL,
  "name" text NOT NULL,
  "industry" text,
  "estimatedRevenue" decimal(15, 2),
  "estimatedMargins" decimal(5, 2),
  "fitScore" int NOT NULL DEFAULT 0,
  "scoreMetadata" jsonb,
  "status" "SourcingStatus" NOT NULL DEFAULT 'UNTOUCHED',

  CONSTRAINT "SourcingTarget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SourcingTarget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SourcingTarget_workspaceId_domain_key" UNIQUE ("workspaceId", "domain")
);

-- Index
CREATE INDEX IF NOT EXISTS "SourcingTarget_workspaceId_fitScore_idx" ON "SourcingTarget"("workspaceId", "fitScore" DESC);

-- Enable RLS
ALTER TABLE "SourcingTarget" ENABLE ROW LEVEL SECURITY;

-- Create Policy
-- Default Deny is implicit when RLS is enabled and no policy matches.
-- We add a permissive policy for the owner workspace.
-- "Tenant Isolation: SourcingTarget"
-- READ: Users can only see targets in their workspace.
-- WRITE: Users can only insert/update targets in their workspace.
CREATE POLICY "Tenant Isolation: SourcingTarget" ON "SourcingTarget"
FOR ALL
USING ("workspaceId" = get_auth_workspace_id())
WITH CHECK ("workspaceId" = get_auth_workspace_id());


-------------------------------------------------------------------------------
-- 1. Setup Test Data as Superuser (Bypassing RLS)
-------------------------------------------------------------------------------
SET LOCAL ROLE postgres;

-- Create Workspaces
INSERT INTO public."Workspace" ("id", "workspaceType", "name")
VALUES
  ('33333333-3333-3333-3333-333333333333', 'SEARCHER', 'Sourcing Workspace A'),
  ('44444444-4444-4444-4444-444444444444', 'INVESTOR', 'Sourcing Workspace B');

-- Create Users
INSERT INTO public."User" ("id", "workspaceId", "role", "email", "firstName", "lastName")
VALUES
  ('aaaaaaaa-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'ADMIN', 'user_source_a@test.com', 'Sourcing', 'A'),
  ('bbbbbbbb-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'ADMIN', 'user_source_b@test.com', 'Sourcing', 'B');

-- Seed Data: SourcingTarget for Workspace B (Target for Negative Test)
INSERT INTO "SourcingTarget" ("id", "workspaceId", "domain", "name", "status")
VALUES
  ('dddddddd-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'target-b.com', 'Target B', 'UNTOUCHED');


-------------------------------------------------------------------------------
-- 2. Verify RLS for User A (Workspace A)
-------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-3333-3333-3333-333333333333', true);

-- 2.1 Positive Assertion: Can Insert into Workspace A
DO $$
BEGIN
  INSERT INTO "SourcingTarget" ("id", "workspaceId", "domain", "name", "status")
  VALUES ('cccccccc-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'target-a.com', 'Target A', 'UNTOUCHED');
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'User A failed to insert into Workspace A: %', SQLERRM;
END $$;

-- 2.2 Positive Assertion: Can Read from Workspace A
DO $$
DECLARE
  found BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM "SourcingTarget" WHERE id = 'cccccccc-3333-3333-3333-333333333333') INTO found;
  IF NOT found THEN
    RAISE EXCEPTION 'User A cannot read their own SourcingTarget';
  END IF;
END $$;

-- 2.3 Negative Assertion: Cannot Read from Workspace B
DO $$
DECLARE
  found BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM "SourcingTarget" WHERE id = 'dddddddd-4444-4444-4444-444444444444') INTO found;
  IF found THEN
    RAISE EXCEPTION 'User A was able to read Workspace B SourcingTarget';
  END IF;
END $$;

-- 2.4 Negative Assertion: Cannot Insert into Workspace B
DO $$
BEGIN
  BEGIN
    INSERT INTO "SourcingTarget" ("workspaceId", "domain", "name", "status")
    VALUES ('44444444-4444-4444-4444-444444444444', 'fail.com', 'Fail Target', 'UNTOUCHED');
    RAISE EXCEPTION 'User A was able to insert into Workspace B';
  EXCEPTION WHEN OTHERS THEN
    -- Check if it's an RLS violation.
    -- Postgres error 42501 (insufficient_privilege) usually for RLS violation on INSERT if policy fails.
    -- Or just generic check that it failed.
    IF SQLERRM LIKE '%User A was able to insert into Workspace B%' THEN
       RAISE;
    END IF;
  END;
END $$;


DO $$
BEGIN
  RAISE NOTICE 'SourcingTarget RLS Verification Passed!';
END $$;

ROLLBACK;
