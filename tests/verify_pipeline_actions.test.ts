
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

// Mock next/cache before imports
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Dynamic import for actions to ensure mocks are applied if they import next/cache
// But static import is fine because vi.mock is hoisted.
import { getPipelineAction, updateDealStageAction, archiveDealAction } from '../src/features/deals/actions';

// Mock types if needed, but we can rely on inference or explicit typing in tests
type DealStage = 'INBOX' | 'NDA_SIGNED' | 'CIM_REVIEW' | 'LOI_ISSUED' | 'DUE_DILIGENCE' | 'CLOSED_WON';

describe('Kanban Pipeline Verification', () => {
    let pg: PGlite;

    beforeAll(async () => {
        pg = new PGlite();

        // 0. Setup Auth Mock
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
                if (file.includes('00001')) {
                    sql = sql.replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '');
                }
                try {
                    await pg.exec(sql);
                } catch (e) {
                    console.error(`Error applying ${file}:`, e);
                    throw e;
                }
            }
        }
    });

    it('should verify RLS policies', async () => {
        const workspaceId = '00000000-0000-0000-0000-000000000001';
        const otherWorkspaceId = '00000000-0000-0000-0000-000000000002';
        const userId = '00000000-0000-0000-0000-000000000003';
        const otherUserId = '00000000-0000-0000-0000-000000000004';

        // Insert Data as Superuser
        await pg.exec(`
            INSERT INTO "Workspace" (id, "workspaceType", name, "subscriptionPlan")
            VALUES ('${workspaceId}', 'SEARCHER', 'My Workspace', 'FREE'),
                   ('${otherWorkspaceId}', 'SEARCHER', 'Other Workspace', 'FREE');

            INSERT INTO "User" (id, "workspaceId", role, email, "firstName", "lastName")
            VALUES ('${userId}', '${workspaceId}', 'ADMIN', 'test@test.com', 'Test', 'User'),
                   ('${otherUserId}', '${otherWorkspaceId}', 'ADMIN', 'other@test.com', 'Other', 'User');

            INSERT INTO "Company" (id, "workspaceId", name, domain, "hashedDomain")
            VALUES ('${workspaceId}', '${workspaceId}', 'Test Co', 'test.com', 'hash123'),
                   ('${otherWorkspaceId}', '${otherWorkspaceId}', 'Other Co', 'other.com', 'hash456');

            INSERT INTO "Deal" (id, "workspaceId", "companyId", stage, status, "visibilityTier", "lossReason")
            VALUES ('${workspaceId}', '${workspaceId}', '${workspaceId}', 'INBOX', 'ACTIVE', 'TIER_1_PRIVATE', NULL),
                   ('${otherWorkspaceId}', '${otherWorkspaceId}', '${otherWorkspaceId}', 'INBOX', 'ACTIVE', 'TIER_1_PRIVATE', NULL);
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
        expect(myDeals.rows[0].id).toBe(workspaceId); // we reused workspaceId as dealId for simplicity
    });

    it('should verify getPipelineAction logic', async () => {
        const userId = 'user-1';
        const workspaceId = 'ws-1';

        const mockDeals = [
            { id: 'd1', stage: 'INBOX', status: 'ACTIVE', visibilityTier: 'TIER_1_PRIVATE', createdAt: new Date().toISOString(), company: { name: 'Comp A' } },
            { id: 'd2', stage: 'NDA_SIGNED', status: 'ACTIVE', visibilityTier: 'TIER_2_SHARED', createdAt: new Date().toISOString(), company: { name: 'Comp B' } }
        ];

        const mockClient = createMockSupabase(userId, workspaceId, { deals: mockDeals });

        const pipeline = await getPipelineAction(workspaceId, mockClient);

        expect(pipeline.columns).toBeDefined();
        expect(pipeline.columns.INBOX.length).toBe(1);
        expect(pipeline.columns.NDA_SIGNED.length).toBe(1);
        expect(pipeline.columns.INBOX[0].companyName).toBe('Comp A');
    });

    it('should verify updateDealStageAction logic', async () => {
        const userId = 'user-1';
        const workspaceId = 'ws-1';
        const updateMockData: any = {};
        const updateClient = createMockSupabase(userId, workspaceId, updateMockData);

        const updateRes = await updateDealStageAction({ dealId: 'd1', newStage: 'CIM_REVIEW' }, updateClient);
        expect(updateRes.success).toBe(true);
        expect(updateMockData.lastUpdate.updates).toEqual({ stage: 'CIM_REVIEW' });

        const invalidUpdate = await updateDealStageAction({ dealId: 'd1', newStage: 'INVALID_STAGE' } as any, updateClient);
        expect(invalidUpdate.success).toBe(false);
    });

    it('should verify archiveDealAction logic', async () => {
        const userId = 'user-1';
        const workspaceId = 'ws-1';
        const archiveMockData: any = {};

        const createArchiveClient = (currentStage: string) => ({
            auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
            from: (table: string) => {
                const chain = {
                    select: () => chain,
                    eq: (col: string, val: any) => chain,
                    single: async () => {
                         if (table === 'User') return { data: { workspaceId }, error: null };
                         if (table === 'Deal') {
                              return { data: { id: 'd1', stage: currentStage, workspaceId }, error: null };
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
        });

        // Test 1: Early stage, no reason -> ARCHIVED
        archiveMockData.lastUpdate = null;
        await archiveDealAction({ dealId: 'd1' }, createArchiveClient('INBOX'));
        expect(archiveMockData.lastUpdate.status).toBe('ARCHIVED');
        expect(archiveMockData.lastUpdate.lossReason).toBeNull();

        // Test 2: Late stage, reason provided -> LOST
        archiveMockData.lastUpdate = null;
        await archiveDealAction({ dealId: 'd1', lossReason: 'Too expensive' }, createArchiveClient('CIM_REVIEW'));
        expect(archiveMockData.lastUpdate.status).toBe('LOST');
        expect(archiveMockData.lastUpdate.lossReason).toBe('Too expensive');

        // Test 3: Late stage, no reason -> Fail
        archiveMockData.lastUpdate = null;
        const failRes = await archiveDealAction({ dealId: 'd1' }, createArchiveClient('CIM_REVIEW'));
        expect(failRes.success).toBe(false);
    });
});

// Helper
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
