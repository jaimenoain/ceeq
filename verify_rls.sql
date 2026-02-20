-- verify_rls.sql
-- Standalone verification script to test Tenant Isolation via RLS.
-- This script assumes the schema from 'supabase/migrations/00001_core_schema.sql' is applied.
-- It runs within a transaction and rolls back changes to keep the DB clean.

BEGIN;

-------------------------------------------------------------------------------
-- 1. Setup Test Data as Superuser (Bypassing RLS)
-------------------------------------------------------------------------------
SET LOCAL ROLE postgres;

-- Create Workspaces
INSERT INTO public."Workspace" ("id", "workspaceType", "name")
VALUES
  ('11111111-1111-1111-1111-111111111111', 'SEARCHER', 'Workspace A'),
  ('22222222-2222-2222-2222-222222222222', 'INVESTOR', 'Workspace B');

-- Create Users (mimicking auth.users linked via ID)
INSERT INTO public."User" ("id", "workspaceId", "role", "email", "firstName", "lastName")
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ADMIN', 'user_a@test.com', 'User', 'A'),
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'ADMIN', 'user_b@test.com', 'User', 'B');

-- Create Companies
INSERT INTO public."Company" ("id", "workspaceId", "name", "domain", "hashedDomain")
VALUES
  ('cccc1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Company A', 'company-a.com', 'hash_a'),
  ('cccc2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Company B', 'company-b.com', 'hash_b');

-------------------------------------------------------------------------------
-- 2. Verify RLS for User A (Workspace A)
-------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaa1111-1111-1111-1111-111111111111', true);

-- Check 2.1: Should see Workspace A
DO $$
DECLARE
  count_ws INTEGER;
BEGIN
  SELECT count(*) INTO count_ws FROM public."Workspace";
  IF count_ws != 1 THEN
    RAISE EXCEPTION 'User A should see exactly 1 workspace, saw %', count_ws;
  END IF;
END $$;

-- Check 2.2: Should NOT see Workspace B
DO $$
DECLARE
  found_ws_b BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public."Workspace" WHERE id = '22222222-2222-2222-2222-222222222222') INTO found_ws_b;
  IF found_ws_b THEN
    RAISE EXCEPTION 'User A should NOT see Workspace B';
  END IF;
END $$;

-- Check 2.3: Should see Company A
DO $$
DECLARE
  count_comp INTEGER;
BEGIN
  SELECT count(*) INTO count_comp FROM public."Company";
  IF count_comp != 1 THEN
    RAISE EXCEPTION 'User A should see exactly 1 company, saw %', count_comp;
  END IF;
END $$;

-- Check 2.4: Should NOT see Company B
DO $$
DECLARE
  found_comp_b BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public."Company" WHERE id = 'cccc2222-2222-2222-2222-222222222222') INTO found_comp_b;
  IF found_comp_b THEN
    RAISE EXCEPTION 'User A should NOT see Company B';
  END IF;
END $$;

-------------------------------------------------------------------------------
-- 3. Verify RLS for User B (Workspace B)
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', 'bbbb2222-2222-2222-2222-222222222222', true);

-- Check 3.1: Should see Workspace B
DO $$
DECLARE
  found_ws_b BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public."Workspace" WHERE id = '22222222-2222-2222-2222-222222222222') INTO found_ws_b;
  IF NOT found_ws_b THEN
    RAISE EXCEPTION 'User B should see Workspace B';
  END IF;
END $$;

-- Check 3.2: Should NOT see Workspace A
DO $$
DECLARE
  found_ws_a BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public."Workspace" WHERE id = '11111111-1111-1111-1111-111111111111') INTO found_ws_a;
  IF found_ws_a THEN
    RAISE EXCEPTION 'User B should NOT see Workspace A';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'RLS Verification Passed!';
END $$;

ROLLBACK;
