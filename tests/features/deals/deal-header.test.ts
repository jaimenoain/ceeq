import { describe, it, expect, vi } from 'vitest';
import { getDealHeaderAction } from '../../../src/features/deals/actions';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

describe('getDealHeaderAction', () => {
  it('should return DealHeaderDTO with correct mapping', async () => {
    const mockDeal = {
      id: 'deal-123',
      stage: 'INBOX',
      visibilityTier: 'TIER_1_PRIVATE',
      company: {
        name: 'Test Company',
        domain: 'https://www.example.com'
      }
    };
    const mockUserProfile = { workspaceId: 'ws-1' };

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    // Mock chain: from('User').select().eq().single()
    const singleUser = vi.fn().mockResolvedValue({ data: mockUserProfile, error: null });
    const eqUser = vi.fn().mockReturnValue({ single: singleUser });
    const selectUser = vi.fn().mockReturnValue({ eq: eqUser });

    // Mock chain: from('Deal').select().eq().eq().single()
    const singleDeal = vi.fn().mockResolvedValue({ data: mockDeal, error: null });
    const eqDeal2 = vi.fn().mockReturnValue({ single: singleDeal });
    const eqDeal1 = vi.fn().mockReturnValue({ eq: eqDeal2 });
    const selectDeal = vi.fn().mockReturnValue({ eq: eqDeal1 });

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'User') return { select: selectUser };
        if (table === 'Deal') return { select: selectDeal };
        return { select: vi.fn() };
    });

    const result = await getDealHeaderAction('deal-123', mockSupabase);

    expect(result).toEqual({
      id: 'deal-123',
      companyName: 'Test Company',
      rootDomain: 'example.com',
      stage: 'Lead',
      privacyTier: 'Tier 1'
    });
  });
});
