
import { fetchWrapper } from '../src/shared/lib/api';

async function verifyMock() {
  process.env.NEXT_PUBLIC_USE_MOCKS = 'true';

  try {
    const response = await fetchWrapper('/api/searcher/dashboard');

    if (response instanceof Response) {
      console.log('✅ Success: fetchWrapper returned a native Response object.');
      process.exit(0);
    } else {
      console.error('❌ Failure: fetchWrapper returned an object that is NOT an instance of Response.');
      console.log('Returned object:', response);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

verifyMock();
