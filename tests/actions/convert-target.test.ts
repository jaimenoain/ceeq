import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('../../src/shared/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Import the module under test and the mocked dependency
import { convertTargetToDealAction } from '../../src/features/deals/actions';
import { createClient } from '../../src/shared/lib/supabase/server';

// Mock types
type SourcingTarget = {
  id: string;
  workspaceId: string;
  domain: string;
  status: 'UNTOUCHED' | 'IN_SEQUENCE' | 'REPLIED' | 'ARCHIVED' | 'CONVERTED';
};

// Helper to create mock Supabase client
const createMockSupabase = (opts: any = {}) => {
  const {
    target = { id: 'target-1', workspaceId: 'ws-1', domain: 'example.com', status: 'REPLIED' },
    collisionStage = null,
    existingLocalCompany = null,
    existingLocalDeal = null,
    rpcError = null,
  } = opts;

  return {
    auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null })
    },
    from: (table: string) => {
      if (table === 'User') {
          return {
              select: () => ({
                  eq: () => ({
                      single: async () => ({ data: { workspaceId: 'ws-1' }, error: null })
                  })
              })
          }
      }

      if (table === 'SourcingTarget') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              single: async () => ({
                data: target && target.id === val ? target : null,
                error: target ? null : { message: 'Target not found' },
              }),
            }),
          }),
          update: (data: any) => ({
            eq: () => ({ error: null }),
          }),
        };
      }

      if (table === 'Company') {
        return {
          select: (cols: string) => ({
            eq: (col1: string, val1: string) => ({
                eq: (col2: string, val2: string) => ({
                     maybeSingle: async () => {
                         if (existingLocalCompany && val1 === existingLocalCompany.workspaceId && val2 === existingLocalCompany.hashedDomain) {
                             return { data: existingLocalCompany, error: null };
                         }
                         return { data: null, error: null };
                     }
                })
            })
          }),
          insert: (data: any) => ({
             select: () => ({
               single: async () => ({
                 data: { id: 'company-new', ...data },
                 error: null,
               }),
             }),
          }),
        };
      }

      if (table === 'Deal') {
        return {
          select: (cols: string) => ({
            eq: (col1: string, val1: string) => ({
                eq: (col2: string, val2: string) => ({
                     maybeSingle: async () => {
                         if (existingLocalDeal && val1 === existingLocalDeal.workspaceId && val2 === existingLocalDeal.companyId) {
                             return { data: existingLocalDeal, error: null };
                         }
                         return { data: null, error: null };
                     }
                })
            })
          }),
          insert: (data: any) => ({
             select: () => ({
               single: async () => ({
                 data: { id: 'deal-new', ...data },
                 error: null,
               }),
             }),
          }),
        };
      }

      return {
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }), maybeSingle: () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ error: null }) }),
      };
    },

    rpc: async (func: string, args: any) => {
      if (func === 'check_global_collision') {
          if (rpcError) return { data: null, error: rpcError };

          if (collisionStage) {
              return { data: { collision: true, stage: collisionStage }, error: null };
          }
          return { data: null, error: null };
      }
      return { data: null, error: null };
    }
  } as any;
};

describe('convertTargetToDealAction Integration Tests', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 1: Successful Conversion (No Collision)', async () => {
    const mockSupabase = createMockSupabase();
    vi.mocked(createClient).mockReturnValue(mockSupabase);

    const result = await convertTargetToDealAction('target-1');

    expect(result.success).toBe(true);
    expect(result.dealId).toBeDefined();
    expect(result.companyId).toBeDefined();
  });

  it('Scenario 2: Collision Detected (Cross-Workspace Leakage Check)', async () => {
    // Workspace B attempts conversion, but Workspace A has NDA_SIGNED
    const mockSupabase = createMockSupabase({
      collisionStage: 'NDA_SIGNED'
    });
    vi.mocked(createClient).mockReturnValue(mockSupabase);

    const result = await convertTargetToDealAction('target-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot convert: Domain hash collision detected. Target already protected under NDA.");

    // Strict Negative Constraint: Ensure NO leakage of Workspace A metadata
    // We check that the error object keys do not contain any ID-like strings or "workspaceId"
    const errorString = JSON.stringify(result);
    expect(errorString).not.toContain('workspace-a');
    expect(errorString).not.toContain('deal-a');

    // Check that we strictly adhere to the error message contract
    expect(Object.keys(result)).toEqual(expect.arrayContaining(['success', 'error']));
    expect(Object.keys(result)).not.toContain('metadata');
    expect(Object.keys(result)).not.toContain('collisionData');
  });

  it('Scenario 3: Fail Closed on RPC Error', async () => {
    const mockSupabase = createMockSupabase({
        rpcError: { message: 'RPC Timeout' }
    });
    vi.mocked(createClient).mockReturnValue(mockSupabase);

    const result = await convertTargetToDealAction('target-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('System error during collision check. Please try again later.');
  });
});
