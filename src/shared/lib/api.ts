import { MOCK_SEARCHER_DASHBOARD, MOCK_SEARCHER_PIPELINE } from './mocks';

export const fetchWrapper = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  if (useMocks) {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
      url = input.url;
    } else {
        url = input.toString();
    }

    if (url.includes('/api/searcher/dashboard')) {
      return mockResponse(MOCK_SEARCHER_DASHBOARD);
    }
    if (url.includes('/api/searcher/pipeline')) {
      return mockResponse(MOCK_SEARCHER_PIPELINE);
    }
  }

  return fetch(input, init);
};

const mockResponse = (data: unknown): Response => {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
