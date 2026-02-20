-- Migration: 00001_core_schema.sql
-- Description: Core schema implementation with strict Tenant Isolation via RLS.
-- This migration translates the provided Prisma schema into Supabase PostgreSQL dialect.

-- Enable UUID extension if not already enabled (standard in Supabase but good practice)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------------------------------------
-- 1. Enums
-------------------------------------------------------------------------------
CREATE TYPE "WorkspaceType" AS ENUM ('SEARCHER', 'INVESTOR');
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'SEARCHER_PRO', 'INVESTOR_PREMIUM');
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANALYST');
CREATE TYPE "DealStage" AS ENUM ('INBOX', 'NDA_SIGNED', 'CIM_REVIEW', 'LOI_ISSUED', 'DUE_DILIGENCE', 'CLOSED_WON');
CREATE TYPE "DealStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'LOST');
CREATE TYPE "VisibilityTier" AS ENUM ('TIER_1_PRIVATE', 'TIER_2_SHARED');
CREATE TYPE "SourcingStatus" AS ENUM ('UNTOUCHED', 'IN_SEQUENCE', 'REPLIED', 'ARCHIVED', 'CONVERTED');

-------------------------------------------------------------------------------
-- 2. Tables
-------------------------------------------------------------------------------

-- Workspace
CREATE TABLE "Workspace" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspaceType" "WorkspaceType" NOT NULL,
  "name" text NOT NULL,
  "stripeCustomerId" text,
  "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" timestamp(3),

  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");


-- User
CREATE TABLE "User" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(), -- Maps to auth.users.id
  "workspaceId" uuid NOT NULL,
  "role" "Role" NOT NULL,
  "email" text NOT NULL,
  "firstName" text NOT NULL,
  "lastName" text NOT NULL,
  "linkedinUrl" text,
  "emailNotifications" boolean NOT NULL DEFAULT true,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");


-- Company
CREATE TABLE "Company" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" uuid NOT NULL,
  "name" text NOT NULL,
  "domain" text NOT NULL,
  "hashedDomain" varchar(64) NOT NULL,
  "industry" text,

  CONSTRAINT "Company_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Company_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);


-- Deal
CREATE TABLE "Deal" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" uuid NOT NULL,
  "companyId" uuid NOT NULL,
  "stage" "DealStage" NOT NULL DEFAULT 'INBOX',
  "status" "DealStatus" NOT NULL DEFAULT 'ACTIVE',
  "visibilityTier" "VisibilityTier" NOT NULL DEFAULT 'TIER_1_PRIVATE',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Deal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Deal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);


-------------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-------------------------------------------------------------------------------

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;

-- Helper Function to get the current user's workspace ID.
-- SECURITY DEFINER allows this function to bypass RLS on the "User" table
-- to retrieve the workspaceId, preventing infinite recursion in policies.
CREATE OR REPLACE FUNCTION get_auth_workspace_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT "workspaceId" FROM "User" WHERE id = auth.uid()
$$;

-- Policies enforcing strict Tenant Isolation

-- Workspace: Users can only see their own workspace.
CREATE POLICY "Tenant Isolation: Workspace" ON "Workspace"
USING ("id" = get_auth_workspace_id());

-- User: Users can only see users in their own workspace.
CREATE POLICY "Tenant Isolation: User" ON "User"
USING ("workspaceId" = get_auth_workspace_id());

-- Company: Users can only see companies in their own workspace.
CREATE POLICY "Tenant Isolation: Company" ON "Company"
USING ("workspaceId" = get_auth_workspace_id());

-- Deal: Users can only see deals in their own workspace.
CREATE POLICY "Tenant Isolation: Deal" ON "Deal"
USING ("workspaceId" = get_auth_workspace_id());
