// jest.setup.ts

// Only import jest-dom for browser environment tests
// For Node.js API tests, we skip this import
if (typeof window !== 'undefined') {
  require('@testing-library/jest-dom');
}

// Set up test environment variables
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://connect:password@localhost:5432/connect?schema=public';
process.env.NEXTAUTH_SECRET = 'test_nextauth_secret_for_testing_only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock Headers class for Node.js environment (not available by default)
class MockHeaders {
  private headers: Record<string, string> = {};

  constructor(init?: Record<string, string>) {
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers[key.toLowerCase()] = value;
      });
    }
  }

  get(name: string): string | null {
    return this.headers[name.toLowerCase()] || null;
  }

  set(name: string, value: string): void {
    this.headers[name.toLowerCase()] = value;
  }

  has(name: string): boolean {
    return name.toLowerCase() in this.headers;
  }
}

// Mock Next.js Web APIs (Request, Response) for API route tests
global.Request = jest.fn().mockImplementation((url, init) => ({
  url,
  method: init?.method || 'GET',
  headers: new MockHeaders(init?.headers),
  json: async () => init?.body ? JSON.parse(init.body) : {},
})) as any;

global.Response = jest.fn().mockImplementation((body, init) => ({
  body,
  status: init?.status || 200,
  headers: new MockHeaders(init?.headers),
  json: async () => typeof body === 'string' ? JSON.parse(body) : body,
})) as any;

// Mock NextResponse and NextRequest for Next.js API routes
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status || 200,
      headers: new Headers(init?.headers),
      json: async () => body,
    })),
  },
  NextRequest: class MockNextRequest {
    url: string;
    method: string;
    headers: MockHeaders;
    body: any;
    
    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new MockHeaders(init?.headers);
      this.body = init?.body;
    }
    
    async json() {
      return this.body ? JSON.parse(this.body) : {};
    }
  },
}));

// Mock NextAuth getServerSession
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock console methods to reduce test noise (optional)
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: jest.fn(), // Keep error for debugging
};
