
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadSourcingCsvAction } from '../src/features/sourcing/actions';
import fs from 'fs';
import path from 'path';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('../src/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('Tech Debt Verification', () => {

  describe('Code Quality', () => {
    it('should have no TODO comments in src/features/sourcing', () => {
      const sourcingDir = path.join(process.cwd(), 'src/features/sourcing');

      function scanDir(dir: string) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            scanDir(filePath);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('TODO')) {
               // Fail if TODO found
               throw new Error(`Found TODO in ${filePath}`);
            }
          }
        });
      }

      expect(() => scanDir(sourcingDir)).not.toThrow();
    });
  });

  describe('uploadSourcingCsvAction Logic', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should attempt actual processing when NEXT_PUBLIC_USE_MOCKS is "false"', async () => {
      process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

      // Mock getUser to return unauthorized to stop execution early but prove it was called
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'Auth error' });

      const formData = new FormData();
      const result = await uploadSourcingCsvAction(formData);

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual({ successCount: 0, skippedCount: 0, error: 'Unauthorized' });
    });

    it('should attempt actual processing even when NEXT_PUBLIC_USE_MOCKS is "true" (bypass removed)', async () => {
      process.env.NEXT_PUBLIC_USE_MOCKS = 'true';

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'Auth error' });

      const formData = new FormData();
      const result = await uploadSourcingCsvAction(formData);

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual({ successCount: 0, skippedCount: 0, error: 'Unauthorized' });
    });

     it('should NOT bypass when NEXT_PUBLIC_USE_MOCKS is undefined', async () => {
      delete process.env.NEXT_PUBLIC_USE_MOCKS;

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'Auth error' });

      const formData = new FormData();
      const result = await uploadSourcingCsvAction(formData);

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual({ successCount: 0, skippedCount: 0, error: 'Unauthorized' });
    });
  });
});
