
import { convertTargetToDeal } from '../src/features/deals/actions';
import crypto from 'crypto';

// Mock types based on strict Data Contracts
type SourcingTarget = {
  id: string;
  workspaceId: string;
  domain: string;
  status: 'UNTOUCHED' | 'IN_SEQUENCE' | 'REPLIED' | 'ARCHIVED' | 'CONVERTED';
  // name and industry removed
};

type Company = {
  id: string;
  workspaceId: string;
  domain: string;
  hashedDomain: string;
};

type Deal = {
  id: string;
  workspaceId: string;
  companyId: string;
  stage: 'INBOX' | 'NDA_SIGNED' | 'CIM_REVIEW' | 'LOI_ISSUED' | 'DUE_DILIGENCE' | 'CLOSED_WON';
  status: 'ACTIVE' | 'ARCHIVED' | 'LOST';
  visibilityTier: 'TIER_1_PRIVATE' | 'TIER_2_SHARED';
};

// Mock setup
const createMockSupabase = (opts: any = {}) => {
  const {
    target = { id: 'target-1', workspaceId: 'ws-1', domain: 'example.com', status: 'REPLIED' },
    // Global collision simulation
    collisionStage = null, // If set, RPC returns this stage
    existingLocalCompany = null,
    existingLocalDeal = null,
    // Errors
    rpcError = null,
  } = opts;

  return {
    auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null })
    },
    from: (table: string) => {
      // User Profile
      if (table === 'User') {
          return {
              select: () => ({
                  eq: () => ({
                      single: async () => ({ data: { workspaceId: 'ws-1' }, error: null })
                  })
              })
          }
      }

      // SourcingTarget
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
            eq: () => ({
              error: null,
            }),
          }),
        };
      }

      // Company (Local Check & Insert)
      if (table === 'Company') {
        return {
          select: (cols: string) => ({
            eq: (col1: string, val1: string) => ({
                eq: (col2: string, val2: string) => ({
                     maybeSingle: async () => {
                         // Check matching logic for local company
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

      // Deal (Local Check & Insert)
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

async function runTests() {
  console.log('Running verification for convertTargetToDeal...');

  // Test 1: Successful Conversion (No Collision)
  {
    console.log('Test 1: Successful Conversion (No Collision)');
    const mockSupabase = createMockSupabase();

    try {
      const result = await convertTargetToDeal(mockSupabase, 'target-1');

      if (!result.success) {
        console.error('Test 1 Failed: Expected success, got', result);
        process.exit(1);
      }

      if (!result.dealId || !result.companyId) {
         console.error('Test 1 Failed: Expected dealId and companyId in response', result);
         process.exit(1);
      }

      console.log('Test 1 Passed');
    } catch (e: any) {
        console.error('Test 1 Failed with exception:', e);
        process.exit(1);
    }
  }

  // Test 2: Collision Blocked (Global NDA)
  {
    console.log('Test 2: Collision Blocked (Global NDA)');

    const mockSupabase = createMockSupabase({
      collisionStage: 'NDA_SIGNED'
    });

    try {
      const result = await convertTargetToDeal(mockSupabase, 'target-1');

      if (result.success) {
        console.error('Test 2 Failed: Expected failure due to collision, but got success');
        process.exit(1);
      }

      if (result.error !== "Cannot convert: Domain hash collision detected. Target already protected under NDA.") {
        console.error(`Test 2 Failed: Expected specific error message, got "${result.error}"`);
        process.exit(1);
      }

      console.log('Test 2 Passed');
    } catch (e: any) {
       console.error('Test 2 Failed with exception:', e);
       process.exit(1);
    }
  }

  // Test 3: Idempotency (Local Company Exists)
  {
    console.log('Test 3: Idempotency (Local Company Exists)');

    const hashedDomain = crypto.createHash('sha256').update('example.com').digest('hex');
    const existingLocalCompany = {
        id: 'company-local',
        workspaceId: 'ws-1',
        hashedDomain
    };

    const mockSupabase = createMockSupabase({
        existingLocalCompany,
        collisionStage: 'NDA_SIGNED'
    });

    try {
      const result = await convertTargetToDeal(mockSupabase, 'target-1');

      if (!result.success) {
        console.error('Test 3 Failed: Expected success (idempotent), got', result);
        process.exit(1);
      }

      if (result.companyId !== 'company-local') {
          console.error('Test 3 Failed: Expected to reuse company-local, got', result.companyId);
          process.exit(1);
      }

      console.log('Test 3 Passed');
    } catch (e: any) {
        console.error('Test 3 Failed with exception:', e);
        process.exit(1);
    }
  }

  // Test 4: RPC Failure (Fail Closed)
  {
    console.log('Test 4: RPC Failure (Fail Closed)');

    const mockSupabase = createMockSupabase({
        rpcError: { message: 'RPC Timeout' }
    });

    try {
        const result = await convertTargetToDeal(mockSupabase, 'target-1');

        if (result.success) {
            console.error('Test 4 Failed: Expected failure due to RPC error, but got success');
            process.exit(1);
        }

        if (result.error !== 'System error during collision check. Please try again later.') {
            console.error(`Test 4 Failed: Expected specific system error, got "${result.error}"`);
            process.exit(1);
        }

        console.log('Test 4 Passed');
    } catch (e: any) {
        console.error('Test 4 Failed with exception:', e);
        process.exit(1);
    }
  }

  console.log('All tests passed!');
}

runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
