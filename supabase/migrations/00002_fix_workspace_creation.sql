-- Migration: 00002_fix_workspace_creation.sql
-- Description: Allow workspace creation by authenticated users and handle initial access.
-- This migration updates the RLS policy for the Workspace table to allow the creator to see the workspace
-- immediately after creation (before they are added as a User), but revokes that access once any User is added.

-------------------------------------------------------------------------------
-- 1. Add createdBy column
-------------------------------------------------------------------------------
-- We default createdBy to the current authenticated user's ID.
ALTER TABLE "Workspace" ADD COLUMN "createdBy" uuid DEFAULT auth.uid();

-------------------------------------------------------------------------------
-- 2. Helper function to check for users (Bypassing RLS)
-------------------------------------------------------------------------------
-- This function checks if a workspace has any users. It runs with SECURITY DEFINER
-- to bypass RLS on the "User" table, ensuring we get an accurate count regardless
-- of the current user's permissions.
CREATE OR REPLACE FUNCTION workspace_has_users(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(SELECT 1 FROM "User" WHERE "workspaceId" = ws_id)
$$;

-------------------------------------------------------------------------------
-- 3. Update RLS Policy
-------------------------------------------------------------------------------
-- Drop the restrictive policy that only allows access via membership.
DROP POLICY "Tenant Isolation: Workspace" ON "Workspace";

-- Create a new policy that allows access if:
-- 1. The user is a member of the workspace (via "User" table).
-- 2. OR The user is the creator of the workspace AND the workspace has no users yet.
CREATE POLICY "Tenant Isolation: Workspace" ON "Workspace"
USING (
  "id" = get_auth_workspace_id()
  OR
  ("createdBy" = auth.uid() AND NOT workspace_has_users("id"))
);

-- Note: This policy implicitly handles INSERT with RETURNING because:
-- - On INSERT, createdBy is set to auth.uid().
-- - No users exist yet, so workspace_has_users returns false.
-- - The condition (createdBy = auth.uid() AND NOT false) evaluates to true.
-- - Therefore, the user can SELECT the row they just inserted.
