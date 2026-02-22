import { updateCompanyFirmographicsAction, updateDealFinancialsAction } from '../src/features/deals/actions';
import { vi, describe, it, expect } from 'vitest';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const MOCK_USER_ID = 'mock-user-id';
const MOCK_WORKSPACE_ID = 'mock-workspace-id';
const MOCK_COMPANY_ID = 'mock-company-id';
const MOCK_DEAL_ID = 'mock-deal-id';

// Mock Supabase Client Helper
function createMockClient(overrides: any = {}) {
  const defaults = {
    auth: {
      getUser: async () => ({ data: { user: { id: MOCK_USER_ID } }, error: null }),
    },
    from: (table: string) => {
      // Mock for User table (permissions check)
      if (table === 'User') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { workspaceId: MOCK_WORKSPACE_ID }, error: null }),
            }),
          }),
        };
      }

      // Mock for Company/Deal updates
      return {
        update: (updates: any) => ({
          eq: (field: string, id: string) => ({
             eq: (field2: string, id2: string) => Promise.resolve({ error: null }),
          })
        }),
        select: () => ({ // Deal ownership check
             eq: () => ({
                 eq: () => ({
                     single: async () => ({ data: { id: MOCK_DEAL_ID }, error: null })
                 })
             })
        })
      };
    },
    ...overrides
  };

  return { ...defaults, ...overrides };
}

describe('Deal Actions Verification', () => {

  // 1. Positive: Update Company Firmographics
  it('should update company firmographics successfully', async () => {
    let updateCalled = false;
    let updatePayload = null;

    const mockClient = createMockClient({
      from: (table: string) => {
        if (table === 'User') return { select: () => ({ eq: () => ({ single: async () => ({ data: { workspaceId: MOCK_WORKSPACE_ID }, error: null }) }) }) };
        if (table === 'Company') {
           return {
             update: (updates: any) => {
               updateCalled = true;
               updatePayload = updates;
               return {
                 eq: (f: string, id: string) => ({
                     eq: (f2: string, id2: string) => Promise.resolve({ error: null })
                 })
               };
             }
           };
        }
        return {};
      }
    });

    const result = await updateCompanyFirmographicsAction({
      companyId: MOCK_COMPANY_ID,
      location: 'New York',
      employees: 100,
      industry: 'Tech'
    }, mockClient);

    expect(result.success).toBe(true);
    expect(updateCalled).toBe(true);
    expect(updatePayload).toEqual({ location: 'New York', employees: 100, industry: 'Tech' });
  });

  // 2. Negative: Update Company Firmographics (Invalid Data)
  it('should fail to update company firmographics with invalid data', async () => {
    const result = await updateCompanyFirmographicsAction({
      companyId: MOCK_COMPANY_ID,
      location: 123 as any, // Invalid type
      employees: 'invalid' as any,
      industry: 123 as any
    }, createMockClient());

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  // 3. Negative: Update Company Firmographics (Unauthorized)
  it('should fail to update company firmographics when unauthorized', async () => {
    const mockClient = createMockClient({
      auth: {
        getUser: async () => ({ data: { user: null }, error: 'Unauthorized' }),
      }
    });

    const result = await updateCompanyFirmographicsAction({
      companyId: MOCK_COMPANY_ID,
      location: 'New York',
      employees: 100,
      industry: 'Tech'
    }, mockClient);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  // 4. Positive: Update Deal Financials
  it('should update deal financials successfully', async () => {
    let updateCalled = false;
    let updatePayload = null;

    const mockClient = createMockClient({
      from: (table: string) => {
        if (table === 'User') return { select: () => ({ eq: () => ({ single: async () => ({ data: { workspaceId: MOCK_WORKSPACE_ID }, error: null }) }) }) };
        if (table === 'Deal') {
           return {
             select: () => ({ // Ownership check
                 eq: () => ({
                     eq: () => ({
                         single: async () => ({ data: { id: MOCK_DEAL_ID }, error: null })
                     })
                 })
             }),
             update: (updates: any) => {
               updateCalled = true;
               updatePayload = updates;
               return {
                 eq: (f: string, id: string) => ({
                     eq: (f2: string, id2: string) => Promise.resolve({ error: null })
                 })
               };
             }
           };
        }
        return {};
      }
    });

    const result = await updateDealFinancialsAction({
      dealId: MOCK_DEAL_ID,
      revenueLtm: 1000000,
      ebitdaLtm: 200000,
      marginPercent: 0.2,
      askingPrice: 5000000
    }, mockClient);

    expect(result.success).toBe(true);
    expect(updateCalled).toBe(true);
    expect(updatePayload).toEqual({ revenueLtm: 1000000, ebitdaLtm: 200000, marginPercent: 0.2, askingPrice: 5000000 });
  });

  // 5. Negative: Update Deal Financials (Invalid Data)
  it('should fail to update deal financials with invalid data', async () => {
    const result = await updateDealFinancialsAction({
      dealId: MOCK_DEAL_ID,
      revenueLtm: 'invalid' as any,
      ebitdaLtm: 'invalid' as any,
      marginPercent: 'invalid' as any,
      askingPrice: 'invalid' as any
    }, createMockClient());

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  // 6. Negative: Update Deal Financials (Unauthorized - Wrong Workspace)
  it('should fail to update deal financials when unauthorized (wrong workspace)', async () => {
    const mockClient = createMockClient({
        from: (table: string) => {
            if (table === 'User') return { select: () => ({ eq: () => ({ single: async () => ({ data: { workspaceId: 'wrong-workspace' }, error: null }) }) }) };
            // Simulate Deal existing in another workspace (so update fails or is prevented)
             if (table === 'Deal') {
                return {
                    select: () => ({ // Ownership check fails to find deal in user workspace
                        eq: () => ({
                            eq: () => ({
                                single: async () => ({ data: null, error: { message: 'Not found' } })
                            })
                        })
                    }),
                    update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: { message: 'Not found' } }) }) })
                };
             }
             return {};
        }
    });

    const result = await updateDealFinancialsAction({
      dealId: MOCK_DEAL_ID,
      revenueLtm: 1000000,
      ebitdaLtm: 200000,
      marginPercent: 0.2,
      askingPrice: 5000000
    }, mockClient);

    expect(result.success).toBe(false);
  });
});
