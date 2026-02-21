
import { processOnboarding } from './src/features/auth/actions';

// Mock setup
const createMockSupabase = (opts: any = {}) => {
  const {
    user = { id: 'user-123', email: 'test@example.com' },
    authError = null,
    workspaceError = null,
    userInsertError = null,
  } = opts;

  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error: authError,
      }),
    },
    from: (table: string) => {
      if (table === 'Workspace') {
        return {
          insert: (data: any) => ({
            select: () => ({
              single: async () => ({
                data: workspaceError ? null : { id: 'workspace-123', ...data },
                error: workspaceError,
              }),
            }),
          }),
        };
      }
      if (table === 'User') {
        return {
          insert: async (data: any) => ({
            error: userInsertError,
          }),
        };
      }
      return {
        insert: () => ({ select: () => ({ single: () => ({}) }) }),
      };
    },
  } as any;
};

async function runTests() {
  console.log('Running verification for processOnboarding...');

  // Test 1: Valid Submission
  {
    console.log('Test 1: Valid Submission');
    const formData = new FormData();
    formData.append('workspaceType', 'SEARCHER');
    formData.append('firstName', 'John');
    formData.append('lastName', 'Doe');
    formData.append('workspaceName', 'Acme Fund');
    formData.append('linkedinUrl', 'https://linkedin.com/in/johndoe');

    const mockSupabase = createMockSupabase();
    const result = await processOnboarding(mockSupabase, formData);

    if (!result.success) {
      console.error('Test 1 Failed:', result);
      process.exit(1);
    }
    console.log('Test 1 Passed');
  }

  // Test 2: Validation Error (Missing fields)
  {
    console.log('Test 2: Validation Error (Missing fields)');
    const formData = new FormData();
    // Missing required fields

    const mockSupabase = createMockSupabase();
    const result = await processOnboarding(mockSupabase, formData);

    if (result.success || !result.validationErrors) {
      console.error('Test 2 Failed: Expected validation errors', result);
      process.exit(1);
    }
    // Check specific error
    if (!result.validationErrors.workspaceType || !result.validationErrors.firstName) {
       console.error('Test 2 Failed: Missing expected field errors', result.validationErrors);
       process.exit(1);
    }
    console.log('Test 2 Passed');
  }

  // Test 3: Auth Error
  {
    console.log('Test 3: Auth Error');
    const formData = new FormData();
    formData.append('workspaceType', 'INVESTOR');
    formData.append('firstName', 'Jane');
    formData.append('lastName', 'Doe');
    formData.append('workspaceName', 'Venture Cap');

    const mockSupabase = createMockSupabase({ user: null, authError: { message: 'Not logged in' } });
    const result = await processOnboarding(mockSupabase, formData);

    if (result.success || result.error !== 'User not authenticated or missing email') {
      console.error('Test 3 Failed: Expected auth error', result);
      process.exit(1);
    }
    console.log('Test 3 Passed');
  }

  // Test 4: Workspace Creation Error
  {
    console.log('Test 4: Workspace Creation Error');
    const formData = new FormData();
    formData.append('workspaceType', 'SEARCHER');
    formData.append('firstName', 'Jack');
    formData.append('lastName', 'Smith');
    formData.append('workspaceName', 'Bad Fund');

    const mockSupabase = createMockSupabase({ workspaceError: { message: 'DB Error' } });
    const result = await processOnboarding(mockSupabase, formData);

    if (result.success || !result.error?.includes('Failed to create workspace')) {
      console.error('Test 4 Failed: Expected workspace creation error', result);
      process.exit(1);
    }
    console.log('Test 4 Passed');
  }

   // Test 5: User Creation Error
  {
    console.log('Test 5: User Creation Error');
    const formData = new FormData();
    formData.append('workspaceType', 'SEARCHER');
    formData.append('firstName', 'Jack');
    formData.append('lastName', 'Smith');
    formData.append('workspaceName', 'Good Fund');

    const mockSupabase = createMockSupabase({ userInsertError: { message: 'Duplicate user' } });
    const result = await processOnboarding(mockSupabase, formData);

    if (result.success || !result.error?.includes('Failed to create user profile')) {
      console.error('Test 5 Failed: Expected user creation error', result);
      process.exit(1);
    }
    console.log('Test 5 Passed');
  }

  console.log('All tests passed!');
}

runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
