
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { vi, describe, it, expect, beforeAll } from 'vitest';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// We need to import actions dynamically or statically.
// Since we are in a test file, we can import them statically if we want,
// but let's stick to the script's logic or just import them.
import { getPipelineAction, updateDealStageAction, archiveDealAction } from '../src/features/deals/actions';

// Mock types
type DealStage = 'INBOX' | 'NDA_SIGNED' | 'CIM_REVIEW' | 'LOI_ISSUED' | 'DUE_DILIGENCE' | 'CLOSED_WON';

async function setupDB() {
  const pg = new PGlite();

  // 0. Setup Auth Mock (Before migrations as they might use auth.uid())
  await pg.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      SELECT current_setting('request.jwt.claim.sub', true)::uuid
      $$ LANGUAGE sql STABLE;
  `);

  // 1. Apply Migrations
  const migrationDir = path.join(process.cwd(), 'supabase/migrations');
  const files = fs.readdirSync(migrationDir).sort();
  for (const file of files) {
      if (file.endsWith('.sql')) {
          let sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
          // Remove CREATE EXTENSION as PGlite usually handles it or has it built-in
          if (file.includes('00001')) {
               sql = sql.replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '');
          }
          // Remove other unsupported extensions if any
          try {
            await pg.exec(sql);
          } catch (e) {
              console.error(`Error applying ${file}:`, e);
              throw e;
          }
      }
  }

  return pg;
}

describe('Kanban Pipeline Verification', () => {
    let pg: PGlite;

    beforeAll(async () => {
        pg = await setupDB();
    });

    it('should enforce RLS correctly', async () => {
        console.log("Verifying RLS...");

        const workspaceId = '00000000-0000-0000-0000-000000000001';
        const otherWorkspaceId = '00000000-0000-0000-0000-000000000002';
        const userId = '00000000-0000-0000-0000-000000000003';
        const otherUserId = '00000000-0000-0000-0000-000000000004';

        // Insert Workspaces
        await pg.exec(`
            INSERT INTO "Workspace" (id, "workspaceType", name, "subscriptionPlan")
            VALUES ('${workspaceId}', 'SEARCHER', 'My Workspace', 'FREE');
            INSERT INTO "Workspace" (id, "workspaceType", name, "subscriptionPlan")
            VALUES ('${otherWorkspaceId}', 'SEARCHER', 'Other Workspace', 'FREE');
        `);

        // Insert Users
        await pg.exec(`
            INSERT INTO "User" (id, "workspaceId", role, email, "firstName", "lastName")
            VALUES ('${userId}', '${workspaceId}', 'ADMIN', 'test@test.com', 'Test', 'User');
            INSERT INTO "User" (id, "workspaceId", role, email, "firstName", "lastName")
            VALUES ('${otherUserId}', '${otherWorkspaceId}', 'ADMIN', 'other@test.com', 'Other', 'User');
        `);

        // Insert Companies
        await pg.exec(`
            INSERT INTO "Company" (id, "workspaceId", name, domain, "hashedDomain")
            VALUES ('${workspaceId}', '${workspaceId}', 'Test Co', 'test.com', 'hash123');
            INSERT INTO "Company" (id, "workspaceId", name, domain, "hashedDomain")
            VALUES ('${otherWorkspaceId}', '${otherWorkspaceId}', 'Other Co', 'other.com', 'hash456');
        `);

        // Insert Deals
        const dealId = '00000000-0000-0000-0000-000000000005';
        const otherDealId = '00000000-0000-0000-0000-000000000006';

        // Check for lossReason column
        try {
            await pg.exec(`
                INSERT INTO "Deal" (id, "workspaceId", "companyId", stage, status, "visibilityTier", "lossReason")
                VALUES ('${dealId}', '${workspaceId}', '${workspaceId}', 'INBOX', 'ACTIVE', 'TIER_1_PRIVATE', NULL);
            `);
        } catch (err: any) {
            if (err.message && err.message.includes('lossReason')) {
                throw new Error('lossReason column missing from Deal table');
            }
            throw err;
        }

        await pg.exec(`
            INSERT INTO "Deal" (id, "workspaceId", "companyId", stage, status, "visibilityTier")
            VALUES ('${otherDealId}', '${otherWorkspaceId}', '${otherWorkspaceId}', 'INBOX', 'ACTIVE', 'TIER_1_PRIVATE');
        `);

        // Setup RLS environment
        await pg.exec(`
            CREATE ROLE authenticated;
            GRANT USAGE ON SCHEMA public TO authenticated;
            GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
            GRANT USAGE ON SCHEMA auth TO authenticated;
            GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
        `);

        // Test Access
        await pg.exec(`SET ROLE authenticated`);
        await pg.exec(`SELECT set_config('request.jwt.claim.sub', '${userId}', false)`);

        const myDeals = await pg.query(`SELECT * FROM "Deal"`);
        expect(myDeals.rows.length).toBe(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((myDeals.rows[0] as any).id).toBe(dealId);

        console.log("RLS Verified.");
    });

    // Mock Helper for Actions
    const createMockSupabase = (userId: string, workspaceId: string, mockData: any = {}) => {
        return {
            auth: {
                getUser: async () => ({ data: { user: { id: userId } }, error: null })
            },
            from: (table: string) => {
                const chain = {
                    select: (cols: string) => chain,
                    eq: (col: string, val: any) => chain,
                    single: async () => {
                        if (table === 'User') return { data: { workspaceId }, error: null };
                        return { data: null, error: 'Not found' };
                    },
                    update: (updates: any) => {
                        mockData.lastUpdate = { table, updates };
                        return chain;
                    },
                    // Mocking the thenable or data return for list
                    then: (resolve: any) => {
                        if (table === 'Deal') {
                             resolve({ data: mockData.deals || [], error: null });
                        }
                        resolve({ data: [], error: null });
                    }
                };
                return chain;
            }
        } as any;
    };

    it('should verify actions logic', async () => {
        console.log("Verifying Actions...");

        const userId = 'user-1';
        const workspaceId = 'ws-1';

        // 1. getPipelineAction
        console.log("Testing getPipelineAction...");
        const mockDeals = [
            { id: 'd1', stage: 'INBOX', status: 'ACTIVE', visibilityTier: 'TIER_1_PRIVATE', createdAt: new Date().toISOString(), company: { name: 'Comp A' } },
            { id: 'd2', stage: 'NDA_SIGNED', status: 'ACTIVE', visibilityTier: 'TIER_2_SHARED', createdAt: new Date().toISOString(), company: { name: 'Comp B' } }
        ];

        const mockClient = createMockSupabase(userId, workspaceId, { deals: mockDeals });

        const pipeline = await getPipelineAction(workspaceId, mockClient);

        expect(pipeline.columns).toBeDefined();
        expect(pipeline.columns.INBOX.length).toBe(1);
        expect(pipeline.columns.NDA_SIGNED.length).toBe(1);
        expect(pipeline.columns.CIM_REVIEW.length).toBe(0);
        expect(pipeline.columns.INBOX[0].companyName).toBe('Comp A');

        // 2. updateDealStageAction
        console.log("Testing updateDealStageAction...");
        const updateMockData: any = {};
        const updateClient = createMockSupabase(userId, workspaceId, updateMockData);

        const updateRes = await updateDealStageAction({ dealId: 'd1', newStage: 'CIM_REVIEW' }, updateClient);
        expect(updateRes.success).toBe(true);
        expect(updateMockData.lastUpdate.updates).toEqual({ stage: 'CIM_REVIEW' });

        // Negative: Invalid stage
        const invalidUpdate = await updateDealStageAction({ dealId: 'd1', newStage: 'INVALID_STAGE' } as any, updateClient);
        expect(invalidUpdate.success).toBe(false);

        // 3. archiveDealAction
        console.log("Testing archiveDealAction...");

        const archiveMockData: any = {};
        const archiveClient = {
            auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
            from: (table: string) => {
                const chain = {
                    select: () => chain,
                    eq: (col: string, val: any) => chain,
                    single: async () => {
                        if (table === 'User') return { data: { workspaceId }, error: null };
                        if (table === 'Deal') {
                             return { data: { id: 'd1', stage: archiveMockData.currentStage || 'INBOX', workspaceId }, error: null };
                        }
                        return { data: null, error: 'Not found' };
                    },
                    update: (updates: any) => {
                        archiveMockData.lastUpdate = updates;
                        return chain;
                    },
                    then: (resolve: any) => resolve({ error: null })
                };
                return chain;
            }
        } as any;

        // Test 1: Early stage, no reason -> ARCHIVED
        archiveMockData.currentStage = 'INBOX';
        await archiveDealAction({ dealId: 'd1' }, archiveClient);
        expect(archiveMockData.lastUpdate.status).toBe('ARCHIVED');
        expect(archiveMockData.lastUpdate.lossReason).toBeNull(); // It might be null or undefined depending on implementation, let's check.
        // In actions.ts: lossReason: lossReason || null. So it should be null if undefined.

        // Test 2: Late stage, reason provided -> LOST
        archiveMockData.currentStage = 'CIM_REVIEW';
        await archiveDealAction({ dealId: 'd1', lossReason: 'Too expensive' }, archiveClient);
        expect(archiveMockData.lastUpdate.status).toBe('LOST');
        expect(archiveMockData.lastUpdate.lossReason).toBe('Too expensive');

        // Test 3: Late stage, no reason -> Fail
        archiveMockData.currentStage = 'CIM_REVIEW';
        const failRes = await archiveDealAction({ dealId: 'd1' }, archiveClient);
        expect(failRes.success).toBe(false);

        console.log("Actions Verified.");
    });
});
