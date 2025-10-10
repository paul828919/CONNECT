# Connect Platform Test Suite

Comprehensive automated tests for the Kakao OAuth authentication flow and organization profile creation.

## Test Coverage

### 1. Unit Tests (`lib/encryption.test.ts`)
Tests for AES-256-GCM encryption utilities (PIPA compliance).

**Test Suites:** 8
**Total Tests:** 29
**Status:** ✅ All Passing

#### Coverage Areas:
- **Key Generation**: Random 256-bit encryption keys
- **Encryption/Decryption**: Business registration number encryption with AES-256-GCM
- **Validation**: Korean business number format validation (XXX-XX-XXXXX)
- **Hashing**: SHA-256 hashing for duplicate detection
- **Key Rotation**: Re-encryption with new keys
- **Performance**: < 5ms per operation
- **Security Edge Cases**: Unicode, special characters, tampering detection

### 2. Integration Tests (`api/organizations.test.ts`)
Tests for `/api/organizations` endpoint with mocked NextAuth sessions.

**Test Categories:**
- **Authentication**: Session validation, unauthorized access prevention
- **Company Creation**: Organization profile creation with encrypted business numbers
- **Research Institute Creation**: Alternative organization type handling
- **Validation**: Required fields, business number format validation
- **Duplicate Prevention**: Business number uniqueness enforcement
- **PIPA Compliance**: AES-256-GCM encryption verification

### 3. End-to-End Tests (`e2e/auth-flow.spec.ts`)
Playwright E2E tests for complete user journey.

**Test Scenarios:**
- Sign-in page display and branding
- Unauthenticated redirect handling
- Organization profile form validation
- Business number format validation
- Company vs Research Institute form toggle
- PIPA compliance notice display
- Responsive design (mobile/tablet)
- Error handling (404, network errors)
- Security (session expiry, sensitive data exposure)

**Note:** Some E2E tests are marked as `.skip()` because they require authenticated sessions. To enable them, set up authentication state using Playwright's `storageState` or mock OAuth flow.

### 4. Test Helpers (`helpers/testHelpers.ts`)
Reusable utilities for test setup and teardown.

**Functions:**
- `createTestUser()`: Create test users in database
- `createTestOrganization()`: Create test organizations
- `cleanupTestData()`: Clean up test data after each test
- `mockSession()`: Mock NextAuth session for API tests
- `generateTestBusinessNumber()`: Generate unique business numbers
- `sampleOrganizationData`: Sample company and research institute data

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Unit tests
npm test -- __tests__/lib/encryption.test.ts

# Integration tests
npm test -- __tests__/api/organizations.test.ts

# E2E tests (requires dev server running)
npm run test:e2e
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Environment Setup

### Required Environment Variables
```bash
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
DATABASE_URL="postgresql://connect:password@localhost:5432/connect?schema=public"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Setup for Tests
```bash
# Create test database
createdb connect_test

# Run migrations
DATABASE_URL="postgresql://connect:password@localhost:5432/connect_test" npx prisma migrate dev

# Seed test data (optional)
DATABASE_URL="postgresql://connect:password@localhost:5432/connect_test" npx prisma db seed
```

## Test Results Summary

### Encryption Utilities (`lib/encryption.test.ts`)
```
✓ generateKey
  ✓ should generate a 64-character hex string
  ✓ should generate unique keys

✓ encrypt
  ✓ should encrypt a business registration number
  ✓ should produce different ciphertext for same plaintext (random IV)
  ✓ should throw error for empty plaintext
  ✓ should throw error if ENCRYPTION_KEY is not set
  ✓ should throw error if ENCRYPTION_KEY has wrong length

✓ decrypt
  ✓ should decrypt an encrypted business registration number
  ✓ should work with various business number formats
  ✓ should throw error for empty encrypted data
  ✓ should throw error for invalid format (missing parts)
  ✓ should throw error for tampered data
  ✓ should throw error for wrong encryption key

✓ validateBusinessNumber
  ✓ should validate correct Korean business registration number format
  ✓ should reject invalid formats

✓ hashBusinessNumber
  ✓ should create SHA-256 hash of business number
  ✓ should be deterministic (same input = same hash)
  ✓ should produce different hashes for different inputs
  ✓ should produce specific hash for known input

✓ rotateKey
  ✓ should re-encrypt data with a new key
  ✓ should produce different ciphertext after rotation

✓ End-to-end encryption flow
  ✓ should complete full encryption-decryption cycle
  ✓ should handle encryption of multiple records

✓ Performance benchmarks
  ✓ should encrypt quickly (< 5ms per operation)
  ✓ should decrypt quickly (< 5ms per operation)

✓ Security edge cases
  ✓ should handle Unicode characters
  ✓ should handle special characters
  ✓ should handle very long strings
  ✓ should reject non-hex encryption keys

Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
Time:        0.185s
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: connect
          POSTGRES_PASSWORD: password
          POSTGRES_DB: connect_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npx prisma migrate dev
      - run: npm test
      - run: npm run test:e2e
```

## Coverage Goals

- **Unit Tests**: 90%+ coverage for critical utilities
- **Integration Tests**: 80%+ coverage for API routes
- **E2E Tests**: Happy path + error scenarios

Current coverage thresholds (in `jest.config.ts`):
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Debugging Tests

### View Test Output
```bash
npm test -- --verbose
```

### Debug Specific Test
```bash
npm test -- -t "should encrypt a business registration number"
```

### Run Tests with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Known Issues & Limitations

1. **E2E Tests with Real OAuth**: E2E tests that require Kakao OAuth are currently skipped. To enable:
   - Set up test Kakao account
   - Use Playwright authentication state persistence
   - Or mock OAuth flow at network level

2. **Integration Tests and Database**: Some integration tests require a clean database. Use `cleanupTestData()` helper to ensure test isolation.

3. **Performance Tests**: Performance benchmarks may vary based on hardware. Tests are configured for < 5ms per operation, which should pass on modern hardware with AES-NI support.

## Next Steps

- [ ] Add API integration tests for other endpoints (matches, funding programs)
- [ ] Implement E2E test authentication state persistence
- [ ] Add visual regression tests for UI components
- [ ] Set up continuous integration with GitHub Actions
- [ ] Add load testing with k6 or Artillery

## Contributing

When adding new tests:

1. Follow existing test structure and naming conventions
2. Use test helpers for database setup/teardown
3. Mock external dependencies (OAuth, payment providers)
4. Add descriptions to test cases for clarity
5. Ensure tests are deterministic and don't depend on external state
6. Clean up test data in `afterEach` hooks

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/docs/)
- [NextAuth.js Testing](https://next-auth.js.org/tutorials/testing)
