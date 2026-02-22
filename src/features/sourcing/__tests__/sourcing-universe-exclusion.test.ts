import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { getSourcingUniverseAction } from '../actions';
import { SupabaseClient } from '@supabase/supabase-js';

// Define the shape of the mock chain
interface MockChain {
  select: Mock;
  eq: Mock;
  neq: Mock;
  or: Mock;
  range: Mock;
  order: Mock;
  single: Mock;
  then: (resolve: (value: { data: unknown[]; count: number; error: null }) => void) => void;
}

// Mock dependencies
const mockChain: MockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
  then: (resolve) => resolve({ data: [], count: 0, error: null }),
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
    await getSourcingUniverseAction({ page: 1 }, mockSupabase as unknown as SupabaseClient);

    // Expect 'neq' to be called for 'status'
    expect(mockChain.neq).toHaveBeenCalledWith('status', 'CONVERTED');
  });

  it('should NOT exclude CONVERTED status when explicit status filter is provided', async () => {
    // Call action WITH status
    await getSourcingUniverseAction({ page: 1, status: 'CONVERTED' }, mockSupabase as unknown as SupabaseClient);

    // Expect 'eq' to be called, and 'neq' NOT to be called
    expect(mockChain.eq).toHaveBeenCalledWith('status', 'CONVERTED');
    expect(mockChain.neq).not.toHaveBeenCalledWith('status', 'CONVERTED');
  });
});
