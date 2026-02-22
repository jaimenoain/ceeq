import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSourcingUniverseAction } from '../actions';

// Mock dependencies
const mockChain: any = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
  then: (resolve: any) => resolve({ data: [], count: 0, error: null }),
};

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => mockChain),
};

describe('getSourcingUniverseAction Exclusion Logic', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_USE_MOCKS: 'false' };

    // Setup default successful auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    });

    // Setup default successful profile
    mockChain.single.mockResolvedValue({
      data: { workspaceId: 'ws1' },
      error: null
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should exclude CONVERTED status when no status filter is provided', async () => {
    // Call action without status
    await getSourcingUniverseAction({ page: 1 }, mockSupabase as any);

    // Expect 'neq' to be called for 'status'
    expect(mockChain.neq).toHaveBeenCalledWith('status', 'CONVERTED');
  });

  it('should NOT exclude CONVERTED status when explicit status filter is provided', async () => {
    // Call action WITH status
    await getSourcingUniverseAction({ page: 1, status: 'CONVERTED' as any }, mockSupabase as any);

    // Expect 'eq' to be called, and 'neq' NOT to be called
    expect(mockChain.eq).toHaveBeenCalledWith('status', 'CONVERTED');
    expect(mockChain.neq).not.toHaveBeenCalledWith('status', 'CONVERTED');
  });
});
