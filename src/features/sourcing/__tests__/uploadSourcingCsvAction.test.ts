import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadSourcingCsvAction } from '../actions';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('../../../shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('uploadSourcingCsvAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if unauthorized', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'Auth error' });
    const formData = new FormData();
    const result = await uploadSourcingCsvAction(formData);
    expect(result).toEqual({ successCount: 0, skippedCount: 0, error: 'Unauthorized' });
  });

  it('should return error if workspace not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });

    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'User') {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle,
            }),
          }),
        };
      }
      return {};
    });

    mockSingle.mockResolvedValue({ data: null, error: 'No profile' });

    const formData = new FormData();
    const result = await uploadSourcingCsvAction(formData);
    expect(result).toEqual({ successCount: 0, skippedCount: 0, error: 'Workspace not found' });
  });

  it('should return error if no file provided', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });

    mockSupabase.from.mockImplementation((table) => {
        if (table === 'User') {
            return {
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: { workspaceId: 'ws1' }, error: null }),
                    }),
                }),
            };
        }
        return {};
    });

    const formData = new FormData();
    // No file appended
    const result = await uploadSourcingCsvAction(formData);
    expect(result).toEqual({ successCount: 0, skippedCount: 0, error: 'No file provided' });
  });

  it('should process valid CSV and upsert data', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });

    // Mock User query
    mockSupabase.from.mockImplementation((table) => {
        if (table === 'User') {
            return {
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: { workspaceId: 'ws1' }, error: null }),
                    }),
                }),
            };
        }
        if (table === 'SourcingTarget') {
            return {
                upsert: vi.fn().mockImplementation((chunk) => {
                    // simulate success
                    return {
                        select: () => Promise.resolve({ data: new Array(chunk.length).fill({ id: '1' }), error: null })
                    };
                }),
            };
        }
        return {};
    });

    const csvContent = 'name,domain,industry\nTarget 1,example.com,Tech\nTarget 2,test.com,Finance';
    const file = new File([csvContent], 'targets.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mappingConfig', JSON.stringify({ name: 'name', domain: 'domain', industry: 'industry' }));

    const result = await uploadSourcingCsvAction(formData);

    expect(result.successCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('should handle duplicates correctly (ignoreDuplicates)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });

    mockSupabase.from.mockImplementation((table) => {
        if (table === 'User') {
            return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { workspaceId: 'ws1' }, error: null }) }) }) };
        }
        if (table === 'SourcingTarget') {
            return {
                upsert: vi.fn().mockImplementation((chunk, options) => {
                    expect(options).toEqual({ onConflict: 'workspaceId, domain', ignoreDuplicates: true });
                    // Simulate that 1 was inserted, 1 was duplicate (ignored, so not returned in select?)
                    // Supabase select() after upsert returns only affected rows usually?
                    // Actually with ignoreDuplicates: true, if it exists, it does nothing.
                    // If we use .select(), it returns the rows that were inserted or updated.
                    // So if 1 is ignored, it returns 1.
                    return {
                        select: () => Promise.resolve({ data: [{ id: '1' }], error: null })
                    };
                }),
            };
        }
        return {};
    });

    const csvContent = 'name,domain\nTarget 1,example.com\nTarget 2,duplicate.com';
    const file = new File([csvContent], 'targets.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadSourcingCsvAction(formData);

    // We simulated 1 success return
    expect(result.successCount).toBe(1);
    expect(result.skippedCount).toBe(1); // 2 total - 1 success
  });

  it('should handle large files by chunking (10,000 rows)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });

    mockSupabase.from.mockImplementation((table) => {
        if (table === 'User') {
            return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { workspaceId: 'ws1' }, error: null }) }) }) };
        }
        if (table === 'SourcingTarget') {
            return {
                upsert: vi.fn().mockImplementation((chunk) => {
                    // Expect chunk size to be <= 1000
                    if (chunk.length > 1000) {
                        throw new Error('Chunk size exceeded 1000');
                    }
                    return {
                        select: () => Promise.resolve({ data: new Array(chunk.length).fill({ id: '1' }), error: null })
                    };
                }),
            };
        }
        return {};
    });

    // Generate 10k rows
    let csvContent = 'name,domain\n';
    for (let i = 0; i < 10000; i++) {
        csvContent += `Target ${i},example${i}.com\n`;
    }

    const file = new File([csvContent], 'large.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadSourcingCsvAction(formData);

    expect(result.successCount).toBe(10000);
    expect(result.skippedCount).toBe(0);
    expect(result.error).toBeUndefined();
  });
});
