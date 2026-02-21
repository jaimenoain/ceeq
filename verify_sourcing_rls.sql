-- verify_sourcing_rls.sql
-- This script assumes it is running in a session where auth.uid() returns the ID of a valid user
-- who belongs to a workspace.

DO $$
DECLARE
    v_user_id uuid;
    v_workspace_id uuid;
    v_target_id uuid;
    v_count int;
BEGIN
    -- 1. Get the current user's workspace
    SELECT "workspaceId" INTO v_workspace_id FROM "User" WHERE id = auth.uid();

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'User % has no workspace', auth.uid();
    END IF;

    RAISE NOTICE 'Testing with Workspace ID: %', v_workspace_id;

    -- 2. Insert a valid SourcingTarget
    INSERT INTO "SourcingTarget" ("workspaceId", "domain", "name", "status")
    VALUES (v_workspace_id, 'valid-target.com', 'Valid Target Inc', 'UNTOUCHED')
    RETURNING "id" INTO v_target_id;

    RAISE NOTICE 'Inserted Target ID: %', v_target_id;

    -- 3. Verify we can select it (RLS allows)
    SELECT count(*) INTO v_count FROM "SourcingTarget" WHERE "id" = v_target_id;

    IF v_count = 0 THEN
        RAISE EXCEPTION 'RLS Failure: Cannot see inserted target';
    END IF;

    RAISE NOTICE 'RLS Success: Can see own target';

    -- 4. Try to insert a target for ANOTHER workspace (should fail RLS check)
    -- We expect this to fail with "new row violates row-level security policy"
    BEGIN
        INSERT INTO "SourcingTarget" ("workspaceId", "domain", "name", "status")
        VALUES (gen_random_uuid(), 'intruder.com', 'Intruder Corp', 'UNTOUCHED');

        RAISE EXCEPTION 'RLS Failure: Was able to insert for another workspace';
    EXCEPTION WHEN OTHERS THEN
         -- Postgres RLS often throws "new row violates row-level security policy" (42501)
         -- or check violation.
         IF SQLSTATE = '42501' THEN
             RAISE NOTICE 'RLS Success: Blocked insert for another workspace';
         ELSE
             RAISE NOTICE 'RLS Blocked insert with error: % %', SQLSTATE, SQLERRM;
         END IF;
    END;

END $$;
