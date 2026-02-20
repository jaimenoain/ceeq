
// tests/mocks/next_server.ts

export class NextRequest {
  url: string;
  nextUrl: { pathname: string };
  headers: Map<string, string>;
  cookies: any;

  constructor(url: string | URL, init?: any) {
    this.url = url.toString();
    const parsedUrl = new URL(this.url);
    this.nextUrl = { pathname: parsedUrl.pathname };
    this.headers = new Map(Object.entries(init?.headers || {}));

    // Mock cookies
    const cookieStore = new Map();
    this.cookies = {
      getAll: () => Array.from(cookieStore.values()),
      set: (name: string, value: string) => cookieStore.set(name, { name, value }),
      get: (name: string) => cookieStore.get(name),
    };
  }
}

export class NextResponse {
  headers: Map<string, string>;
  cookies: any;
  status: number;
  url?: string;

  constructor(body?: any, init?: any) {
    this.headers = new Map(Object.entries(init?.headers || {}));
    this.status = init?.status || 200;

    const cookieStore = new Map();
    this.cookies = {
      getAll: () => Array.from(cookieStore.values()),
      set: (name: string, value: string, options?: any) => {
        cookieStore.set(name, { name, value, ...options });
      },
      get: (name: string) => cookieStore.get(name),
    };

    // If request passed in init (for .next()), simulate carrying over headers/cookies if needed
    if (init?.request?.headers) {
      // copy headers
    }
  }

  static next(init?: any) {
    return new NextResponse(null, init);
  }

  static redirect(url: string | URL, init?: any) {
    const res = new NextResponse(null, { status: 307, ...init });
    res.headers.set('Location', url.toString());
    return res;
  }
}
