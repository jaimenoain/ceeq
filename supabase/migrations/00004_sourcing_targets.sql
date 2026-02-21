-- Migration: 00004_sourcing_targets.sql
-- Description: Implement SourcingTarget table with RLS.

CREATE TABLE "SourcingTarget" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" uuid NOT NULL,
  "domain" text NOT NULL,
  "name" text NOT NULL,
  "industry" text,
  "estimatedRevenue" numeric(15, 2),
  "estimatedMargins" numeric(5, 2),
  "fitScore" integer NOT NULL DEFAULT 0,
  "scoreMetadata" jsonb,
  "status" "SourcingStatus" NOT NULL DEFAULT 'UNTOUCHED',

  CONSTRAINT "SourcingTarget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SourcingTarget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SourcingTarget_workspaceId_domain_key" ON "SourcingTarget"("workspaceId", "domain");
CREATE INDEX "SourcingTarget_workspaceId_fitScore_idx" ON "SourcingTarget"("workspaceId", "fitScore" DESC);

ALTER TABLE "SourcingTarget" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation: SourcingTarget" ON "SourcingTarget"
AS PERMISSIVE FOR ALL
TO public
USING ("workspaceId" = get_auth_workspace_id())
WITH CHECK ("workspaceId" = get_auth_workspace_id());
