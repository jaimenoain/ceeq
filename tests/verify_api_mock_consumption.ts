import { fetchWrapper } from '../src/shared/lib/api';
import { MOCK_SEARCHER_DASHBOARD } from '../src/shared/lib/mocks';

async function verifyMockConsumption() {
  process.env.NEXT_PUBLIC_USE_MOCKS = 'true';

  try {
    console.log('Testing fetchWrapper with mocks enabled...');
    const response = await fetchWrapper('/api/searcher/dashboard');

    if (!(response instanceof Response)) {
      console.error('❌ Failure: fetchWrapper returned an object that is NOT an instance of Response.');
      process.exit(1);
    }
    console.log('✅ Response is an instance of Response.');

    const data = await response.json();
    console.log('✅ Response.json() parsed successfully.');

    // Verify data matches mock
    const expected = JSON.stringify(MOCK_SEARCHER_DASHBOARD);
    const actual = JSON.stringify(data);

    if (expected === actual) {
      console.log('✅ Success: Data matches expected mock data.');
      process.exit(0);
    } else {
      console.error('❌ Failure: Data does not match expected mock data.');
      console.error('Expected:', expected);
      console.error('Actual:', actual);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

verifyMockConsumption();
