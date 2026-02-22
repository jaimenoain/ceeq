import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSourcingUniverseAction } from '../actions';
import { fetchSourcingUniverse } from '../lib/mock-api';
import { createClient } from '../../../shared/lib/supabase/server';

vi.mock('../lib/mock-api', () => ({
  fetchSourcingUniverse: vi.fn(),
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('../../../shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('getSourcingUniverseAction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use fetchSourcingUniverse when NEXT_PUBLIC_USE_MOCKS is "true"', async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
    const mockData = { data: [], meta: { totalCount: 0, currentPage: 1, totalPages: 0 } };
    vi.mocked(fetchSourcingUniverse).mockResolvedValue(mockData);

    const result = await getSourcingUniverseAction({ page: 1 });

    expect(fetchSourcingUniverse).toHaveBeenCalledWith({ page: 1 });
    expect(createClient).not.toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });

  it('should use Supabase client when NEXT_PUBLIC_USE_MOCKS is "false"', async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
    const mockUser = { id: 'user1' };
    const mockWorkspace = { workspaceId: 'ws1' };
    const mockData = [{ id: '1', name: 'Test', domain: 'test.com', status: 'UNTOUCHED', createdAt: new Date().toISOString() }];

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null }),
      or: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, count: 1, error: null }),
    };

    mockSupabase.from.mockReturnValue(mockChain);

    const result = await getSourcingUniverseAction({ page: 1 });

    expect(fetchSourcingUniverse).not.toHaveBeenCalled();
    // createClient is called because we didn't pass a mockClient
    expect(createClient).toHaveBeenCalled();
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].domain).toBe('test.com');
  });
});
