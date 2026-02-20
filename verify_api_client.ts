
import { fetchWrapper } from './src/shared/lib/api';
import { MOCK_SEARCHER_DASHBOARD } from './src/shared/lib/mocks';

// Set env var BEFORE importing if it was used at module level, but api.ts uses it inside function.
process.env.NEXT_PUBLIC_USE_MOCKS = 'true';

async function run() {
  console.log('Running API Client Verification...');
  try {
    const response = await fetchWrapper('/api/searcher/dashboard');
    const data = await response.json();

    // Deep equality check (simple stringify for now)
    const expected = JSON.stringify(MOCK_SEARCHER_DASHBOARD);
    const actual = JSON.stringify(data);

    if (actual === expected) {
       console.log('✅ API Client Verification Passed: Mock data returned correctly.');
    } else {
       console.error('❌ API Client Verification Failed: Data mismatch.');
       console.error('Expected:', expected);
       console.error('Actual:', actual);
       process.exit(1);
    }
  } catch (e) {
    console.error('❌ API Client Verification Failed with error:', e);
    process.exit(1);
  }
}

run();
