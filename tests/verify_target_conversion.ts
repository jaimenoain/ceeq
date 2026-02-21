
import { convertTargetToDeal } from '../src/features/deals/actions';

// Mock types based on the schema
type SourcingTarget = {
  id: string;
  workspaceId: string;
  domain: string;
  status: 'UNTOUCHED' | 'IN_SEQUENCE' | 'REPLIED' | 'ARCHIVED' | 'CONVERTED';
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
    existingCompany = null,
    existingDeal = null,
    companyInsertError = null,
    dealInsertError = null,
    targetUpdateError = null,
  } = opts;

  return {
    from: (table: string) => {
      // Mock SourcingTarget table
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
              error: targetUpdateError,
            }),
          }),
        };
      }

      // Mock Company table (Global Search & Insert)
      if (table === 'Company') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
               // Simulate global search by hashedDomain
               if (col === 'hashedDomain') {
                 return {
                   maybeSingle: async () => ({
                     data: existingCompany,
                     error: null,
                   }),
                   // Support single() as well if used
                   single: async () => ({
                     data: existingCompany,
                     error: existingCompany ? null : { message: 'Not found' },
                   })
                 };
               }
               return {
                 maybeSingle: async () => ({ data: null, error: null }),
                 single: async () => ({ data: null, error: { message: 'Not found' } })
               };
            },
          }),
          insert: (data: any) => ({
             select: () => ({
               single: async () => ({
                 data: companyInsertError ? null : { id: 'company-new', ...data },
                 error: companyInsertError,
               }),
             }),
          }),
        };
      }

      // Mock Deal table (Global Search & Insert)
      if (table === 'Deal') {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
               // Simulate searching for deal by companyId
               if (col === 'companyId') {
                 // In a real scenario, this might return multiple deals, but for collision check we care if *any* active deal exists.
                 // We'll mock it returning a list.
                 return {
                   data: existingDeal ? [existingDeal] : [],
                   error: null,
                 };
               }
               return { data: [], error: null };
            }
          }),
          insert: (data: any) => ({
             select: () => ({
               single: async () => ({
                 data: dealInsertError ? null : { id: 'deal-new', ...data },
                 error: dealInsertError,
               }),
             }),
          }),
        };
      }

      return {
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ error: null }) }),
      };
    },
    // Mock RPC if used for collision check
    rpc: (func: string, args: any) => {
      // If logic uses RPC for collision
      return { data: null, error: null };
    }
  } as any;
};

async function runTests() {
  console.log('Running verification for convertTargetToDeal...');

  // Test 1: Positive Assertion - Successful Conversion
  {
    console.log('Test 1: Positive Assertion - Successful Conversion');
    const mockSupabase = createMockSupabase(); // Default: target exists, no collision

    // We assume the action takes the supabase client as first arg, or we use a wrapper.
    // Based on `processOnboarding`, it likely takes (supabase, payload).
    // Or if it's a server action directly, it might construct its own client.
    // But for testability, we usually separate logic.
    // Let's assume the signature: convertTargetToDeal(supabase, targetId)

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

  // Test 2: Negative Assertion - Collision
  {
    console.log('Test 2: Negative Assertion - Collision');

    // Setup collision scenario:
    // Existing company with hashed domain
    // Existing deal in NDA_SIGNED stage
    const existingCompany = {
      id: 'company-collision',
      workspaceId: 'ws-other',
      domain: 'example.com',
      hashedDomain: 'hashed-example.com', // The logic should compute this hash and match
    };

    const existingDeal = {
      id: 'deal-collision',
      workspaceId: 'ws-other',
      companyId: 'company-collision',
      stage: 'NDA_SIGNED', // >= NDA_SIGNED -> Collision
      status: 'ACTIVE',
      visibilityTier: 'TIER_1_PRIVATE',
    };

    const mockSupabase = createMockSupabase({
      existingCompany,
      existingDeal,
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
       // If it throws instead of returning error object, catch it here.
       // Assuming it returns { error: ... } based on previous patterns.
       console.error('Test 2 Failed with exception:', e);
       process.exit(1);
    }
  }

  console.log('All tests passed!');
}

runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
