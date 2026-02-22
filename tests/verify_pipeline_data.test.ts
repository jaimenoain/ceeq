import { describe, it, expect, vi } from 'vitest';
import { getPipelineAction } from '../src/features/deals/actions';
import { DealStage } from '../src/shared/types/api';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('../src/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const MOCK_WORKSPACE_ID = 'ws-123';
const MOCK_USER_ID = 'user-123';

describe('Pipeline Data Verification', () => {
  it('should fetch and map deal data correctly', async () => {
    const mockSupabase = {
      auth: {
        getUser: async () => ({ data: { user: { id: MOCK_USER_ID } }, error: null }),
      },
      from: (table: string) => {
        // Mock chain
        const chain: any = {
            select: () => chain,
            eq: () => chain,
            single: async () => {
                if (table === 'User') return { data: { workspaceId: MOCK_WORKSPACE_ID }, error: null };
                return { data: null, error: 'Not found' };
            },
            then: (resolve: any) => {
                if (table === 'Deal') {
                    resolve({
                        data: [{
                            id: 'd1',
                            stage: 'INBOX' as DealStage,
                            status: 'ACTIVE',
                            visibilityTier: 'TIER_1_PRIVATE',
                            createdAt: new Date().toISOString(),
                            company: { name: 'Acme Corp', industry: 'SaaS' }
                        }],
                        error: null
                    });
                } else {
                    resolve({ data: [], error: null });
                }
            }
        };
        return chain;
      }
    };

    const result = await getPipelineAction(MOCK_WORKSPACE_ID, mockSupabase);
    const inboxDeals = result.columns.INBOX;

    expect(inboxDeals.length).toBe(1);
    const deal = inboxDeals[0];

    // Assertions for required fields (some will fail initially)
    console.log('Fetched Deal:', deal);

    // Use type casting to check for properties that might not exist on the type yet
    expect((deal as any).industry).toBe('SaaS');
    expect((deal as any).privacyTier).toBe('Tier 1');
  });
});
