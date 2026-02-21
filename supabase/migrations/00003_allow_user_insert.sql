-- Migration: 00003_allow_user_insert.sql
-- Description: Allow authenticated users to create their own profile.

-- Update the RLS policy for the "User" table.
-- The existing policy is:
-- CREATE POLICY "Tenant Isolation: User" ON "User"
-- USING ("workspaceId" = get_auth_workspace_id());

-- We need to allow insert if "id" = auth.uid().
-- Since the existing policy is a generic USING (applies to ALL), we can update it to:
-- USING ("workspaceId" = get_auth_workspace_id() OR "id" = auth.uid())

DROP POLICY "Tenant Isolation: User" ON "User";

CREATE POLICY "Tenant Isolation: User" ON "User"
USING ("workspaceId" = get_auth_workspace_id() OR "id" = auth.uid());
