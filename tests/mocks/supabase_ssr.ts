
// tests/mocks/supabase_ssr.ts

export interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

export type CookieMethods = {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (cookies: Array<{ name: string; value: string; options?: CookieOptions }>) => void;
};

// Mock createServerClient
export const createServerClient = (
  supabaseUrl: string,
  supabaseKey: string,
  options: { cookies: CookieMethods }
) => {
  return {
    auth: {
      getUser: async () => {
        // Simulate a token refresh
        options.cookies.setAll([
          { name: 'sb-access-token', value: 'refreshed-token', options: { path: '/', httpOnly: true } },
          { name: 'sb-refresh-token', value: 'refreshed-refresh-token', options: { path: '/', httpOnly: true } },
        ]);

        return {
          data: {
            user: {
              id: 'mock-user-id',
              email: 'test@example.com',
            },
          },
          error: null,
        };
      },
    },
    from: (table: string) => {
      // Mock 'User' table query
      if (table === 'User') {
        return {
          select: (columns: string) => {
            return {
              eq: (column: string, value: string) => {
                return {
                  single: async () => {
                    // Return a mock user profile with workspace
                    // Let's simulate 'INVESTOR' workspace
                    return {
                      data: {
                        workspaceId: 'workspace-123',
                        Workspace: {
                          workspaceType: 'INVESTOR',
                        },
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      };
    },
  };
};
