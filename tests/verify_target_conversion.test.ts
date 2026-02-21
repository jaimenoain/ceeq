import { describe, it, expect, vi } from 'vitest';
import crypto from 'node:crypto';

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
import { convertTargetToDeal } from '../src/features/deals/actions';

// Mock types
type SourcingTarget = {
  id: string;
  workspaceId: string;
  domain: string;
  status: 'UNTOUCHED' | 'IN_SEQUENCE' | 'REPLIED' | 'ARCHIVED' | 'CONVERTED';
};

// Helper to create mock Supabase client (similar to original script)
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

describe('convertTargetToDeal', () => {

  it('Test 1: Successful Conversion (No Collision)', async () => {
    const mockSupabase = createMockSupabase();
    const result = await convertTargetToDeal(mockSupabase, 'target-1');

    expect(result.success).toBe(true);
    expect(result.dealId).toBeDefined();
    expect(result.companyId).toBeDefined();
  });

  it('Test 2: Collision Blocked (Global NDA)', async () => {
    const mockSupabase = createMockSupabase({
      collisionStage: 'NDA_SIGNED'
    });
    const result = await convertTargetToDeal(mockSupabase, 'target-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot convert: Domain hash collision detected. Target already protected under NDA.");
  });

  it('Test 3: Idempotency (Local Company Exists)', async () => {
    const hashedDomain = crypto.createHash('sha256').update('example.com').digest('hex');
    const existingLocalCompany = {
        id: 'company-local',
        workspaceId: 'ws-1',
        hashedDomain
    };

    const mockSupabase = createMockSupabase({
        existingLocalCompany,
        collisionStage: 'NDA_SIGNED' // Should be ignored because local company exists
    });

    const result = await convertTargetToDeal(mockSupabase, 'target-1');

    expect(result.success).toBe(true);
    expect(result.companyId).toBe('company-local');
  });

  it('Test 4: RPC Failure (Fail Closed)', async () => {
    const mockSupabase = createMockSupabase({
        rpcError: { message: 'RPC Timeout' }
    });

    const result = await convertTargetToDeal(mockSupabase, 'target-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('System error during collision check. Please try again later.');
  });

});
