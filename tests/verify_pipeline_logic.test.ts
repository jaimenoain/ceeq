import { describe, it, expect, vi } from 'vitest';

// Mock dependencies before importing the module
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('../../src/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));

// Now import the module under test
import { fetchPipeline, updateDealStage, archiveDeal, loseDeal } from '../src/features/deals/actions';

// Helper to create mock Supabase client
const createMockSupabase = (opts: any = {}) => {
  const {
    user = { id: 'user-1' },
    workspaceId = 'ws-1',
    deals = [],
    updateError = null,
  } = opts;

  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: (table: string) => {
      if (table === 'User') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { workspaceId }, error: null }),
            }),
          }),
        };
      }
      if (table === 'Deal') {
        return {
          select: (cols: string) => {
             // fetchPipeline query
             return {
                 eq: (col1: string, val1: string) => ({
                     eq: (col2: string, val2: string) => Promise.resolve({ data: deals, error: null })
                 })
             };
          },
          update: (updates: any) => ({
            eq: (col1: string, val1: string) => ({
                eq: (col2: string, val2: string) => Promise.resolve({ error: updateError })
            })
          }),
        };
      }
      return {
          select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
          update: () => ({ eq: () => ({ eq: () => ({ error: null }) }) })
      };
    },
  } as any;
};

describe('Pipeline Actions', () => {

  it('fetchPipeline returns correct structure', async () => {
    const deals = [
      { id: 'd1', stage: 'INBOX', status: 'ACTIVE', visibilityTier: 'TIER_1_PRIVATE', createdAt: new Date().toISOString(), company: { name: 'Acme' } },
      { id: 'd2', stage: 'NDA_SIGNED', status: 'ACTIVE', visibilityTier: 'TIER_1_PRIVATE', createdAt: new Date().toISOString(), company: { name: 'Beta' } },
    ];
    const mockClient = createMockSupabase({ deals });
    const pipeline = await fetchPipeline(mockClient);

    expect(pipeline.columns.INBOX).toHaveLength(1);
    expect(pipeline.columns.NDA_SIGNED).toHaveLength(1);
    expect(pipeline.columns.INBOX[0].companyName).toBe('Acme');
  });

  it('updateDealStage success', async () => {
    const mockClient = createMockSupabase();
    const result = await updateDealStage('d1', 'NDA_SIGNED', mockClient);
    expect(result.success).toBe(true);
  });

  it('archiveDeal success', async () => {
    const mockClient = createMockSupabase();
    const result = await archiveDeal('d1', mockClient);
    expect(result.success).toBe(true);
  });

  it('loseDeal success', async () => {
    const mockClient = createMockSupabase();
    const result = await loseDeal('d1', 'Too expensive', mockClient);
    expect(result.success).toBe(true);
  });

  it('loseDeal failure (missing reason)', async () => {
    const mockClient = createMockSupabase();
    // @ts-ignore
    const result = await loseDeal('d1', '', mockClient);
    expect(result.success).toBe(false);
  });
});
