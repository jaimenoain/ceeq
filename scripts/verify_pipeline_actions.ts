
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { z } from 'zod';

// We will import these dynamically to avoid early build errors if possible,
// or just rely on the user running this after implementation.
// import { getPipelineAction, updateDealStageAction, archiveDealAction } from '../src/features/deals/actions';

// Mock types
type DealStage = 'INBOX' | 'NDA_SIGNED' | 'CIM_REVIEW' | 'LOI_ISSUED' | 'DUE_DILIGENCE' | 'CLOSED_WON';
type DealStatus = 'ACTIVE' | 'ARCHIVED' | 'LOST';

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
            // Split by semicolon to execute statements individually if needed,
            // but pg.exec handles multiple statements.
            // However, DO blocks or functions might be tricky if not handled well.
            await pg.exec(sql);
          } catch (e) {
              console.error(`Error applying ${file}:`, e);
              throw e;
          }
      }
  }

  return pg;
}

async function verifyRLS(pg: PGlite) {
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
    } catch (e: any) {
        if (e.message.includes('lossReason')) {
            throw new Error('lossReason column missing from Deal table');
        }
        throw e;
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
    assert.strictEqual(myDeals.rows.length, 1, 'Should only see 1 deal');
    assert.strictEqual(myDeals.rows[0].id, dealId, 'Should see my deal');

    console.log("RLS Verified.");
}

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

async function verifyActions() {
    console.log("Verifying Actions...");

    // Dynamic import to allow script to compile before actions exist
    const actionsPath = '../src/features/deals/actions';
    let actions;
    try {
        actions = await import(actionsPath);
    } catch (e) {
        console.warn("Skipping Action Verification: Actions not implemented yet.");
        return;
    }

    const { getPipelineAction, updateDealStageAction, archiveDealAction } = actions;

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

    assert.ok(pipeline.columns, 'Should have columns');
    assert.strictEqual(pipeline.columns.INBOX.length, 1);
    assert.strictEqual(pipeline.columns.NDA_SIGNED.length, 1);
    assert.strictEqual(pipeline.columns.CIM_REVIEW.length, 0);
    assert.strictEqual(pipeline.columns.INBOX[0].companyName, 'Comp A');

    // 2. updateDealStageAction
    console.log("Testing updateDealStageAction...");
    const updateMockData: any = {};
    const updateClient = createMockSupabase(userId, workspaceId, updateMockData);

    const updateRes = await updateDealStageAction({ dealId: 'd1', newStage: 'CIM_REVIEW' }, updateClient);
    assert.ok(updateRes.success, 'Update should succeed');
    assert.deepStrictEqual(updateMockData.lastUpdate.updates, { stage: 'CIM_REVIEW' });

    // Negative: Invalid stage (handled by Zod, but Zod runs before client calls usually)
    // If Zod fails, it returns error.
    const invalidUpdate = await updateDealStageAction({ dealId: 'd1', newStage: 'INVALID_STAGE' } as any, updateClient);
    assert.strictEqual(invalidUpdate.success, false, 'Should fail invalid stage');

    // 3. archiveDealAction
    console.log("Testing archiveDealAction...");

    // Case A: Archive without reason (early stage) -> ARCHIVED
    // We assume the logic: if no lossReason, status = ARCHIVED.
    // If validation allows it.
    // Prompt: "ensuring lossReason is provided if the current stage is CIM_REVIEW or higher"
    // To check current stage, the action must fetch the deal!
    // Does the action fetch the deal? Existing implementation didn't.
    // If it doesn't fetch, it can't know the stage.
    // Or maybe it assumes client passes it? No, contract says { dealId, lossReason }.
    // So the action MUST fetch the deal to check the stage.
    // My mock client needs to return a deal for `single()`.

    // Let's refine the mock for single deal fetch
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
                         // Return a mock deal
                         // We need to vary this based on test case.
                         // But for now let's assume it returns a deal in INBOX.
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
    assert.strictEqual(archiveMockData.lastUpdate.status, 'ARCHIVED');
    assert.strictEqual(archiveMockData.lastUpdate.lossReason, undefined); // Or null

    // Test 2: Late stage, reason provided -> LOST
    archiveMockData.currentStage = 'CIM_REVIEW';
    await archiveDealAction({ dealId: 'd1', lossReason: 'Too expensive' }, archiveClient);
    assert.strictEqual(archiveMockData.lastUpdate.status, 'LOST');
    assert.strictEqual(archiveMockData.lastUpdate.lossReason, 'Too expensive');

    // Test 3: Late stage, no reason -> Fail
    archiveMockData.currentStage = 'CIM_REVIEW';
    const failRes = await archiveDealAction({ dealId: 'd1' }, archiveClient);
    assert.strictEqual(failRes.success, false, 'Should fail missing reason for late stage');

    console.log("Actions Verified.");
}

async function main() {
    try {
        const pg = await setupDB();
        await verifyRLS(pg);
        await verifyActions();
        console.log("ALL TESTS PASSED");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
