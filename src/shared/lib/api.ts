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
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
    // Minimal implementation of other methods/properties to satisfy Response interface partially
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'default',
    url: '',
    clone: () => mockResponse(data),
  } as unknown as Response;
};
