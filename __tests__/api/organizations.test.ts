/**
 * Integration Tests for Organizations API
 *
 * Tests the /api/organizations endpoint for creating and managing organizations
 */

import { POST } from '@/app/api/organizations/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import {
  createTestUser,
  createTestOrganization,
  cleanupTestData,
  generateTestBusinessNumber,
  sampleOrganizationData,
} from '../helpers/testHelpers';
import { decrypt } from '@/lib/encryption';
import { closeCacheConnection } from '@/lib/cache/redis-cache';

// Mock NextAuth session
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

const prisma = new PrismaClient();

describe('/api/organizations POST', () => {
  let testUser: any;

  beforeAll(async () => {
    // Set up test encryption key
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }
  });

  beforeEach(async () => {
    // Create a test user for each test
    testUser = await createTestUser();

    // Mock authenticated session
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
        organizationId: null,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Close Redis connection to prevent resource leaks
    await closeCacheConnection();
    // Close Prisma connection
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Mock unauthenticated session
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(sampleOrganizationData.company),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Company Creation', () => {
    it('should create a company organization successfully', async () => {
      const organizationData = {
        ...sampleOrganizationData.company,
        businessNumber: generateTestBusinessNumber(),
      };

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.organization).toBeDefined();
      expect(data.organization.type).toBe('COMPANY');
      expect(data.organization.name).toBe(organizationData.name);
      expect(data.organization.industrySector).toBe(organizationData.industrySector);
      expect(data.organization.employeeCount).toBe(organizationData.employeeCount);
      expect(data.organization.profileScore).toBeGreaterThan(0);

      // Verify user's organizationId was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: { organizationId: true },
      });

      expect(updatedUser?.organizationId).toBe(data.organization.id);

      // Verify business number was encrypted
      const organization = await prisma.organizations.findUnique({
        where: { id: data.organization.id },
        select: { businessNumberEncrypted: true },
      });

      expect(organization?.businessNumberEncrypted).toBeDefined();

      // Verify we can decrypt it
      const decrypted = decrypt(organization!.businessNumberEncrypted);
      expect(decrypted).toBe(organizationData.businessNumber);
    });

    it('should calculate profile score correctly', async () => {
      // Minimum profile (should have lowest score)
      const minimalData = {
        type: 'COMPANY',
        name: 'Minimal Company',
        businessNumber: generateTestBusinessNumber(),
        industrySector: 'ICT',
        employeeCount: 'FROM_10_TO_50',
      };

      const request1 = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(minimalData),
      });

      const response1 = await POST(request1);
      const data1 = await response1.json();

      // Full profile (should have higher score)
      const fullData = {
        ...sampleOrganizationData.company,
        businessNumber: generateTestBusinessNumber(),
      };

      // Create new test user for second organization
      const testUser2 = await createTestUser({ email: `test2-${Date.now()}@example.com` });
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: testUser2.id,
          email: testUser2.email,
          role: 'USER',
          organizationId: null,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const request2 = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(fullData),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(data1.organization.profileScore).toBeLessThan(data2.organization.profileScore);
      expect(data2.organization.profileScore).toBeGreaterThanOrEqual(90); // Full profile should be high
    });
  });

  describe('Research Institute Creation', () => {
    it('should create a research institute successfully', async () => {
      const organizationData = {
        ...sampleOrganizationData.researchInstitute,
        businessNumber: generateTestBusinessNumber(),
        name: 'Test Research Institute',
        industrySector: 'Research',
        employeeCount: 'FROM_50_TO_100',
      };

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.organization.type).toBe('RESEARCH_INSTITUTE');
      expect(data.organization.name).toBe(organizationData.name);
    });
  });

  describe('Validation', () => {
    it('should reject missing required fields', async () => {
      const invalidData = {
        type: 'COMPANY',
        // Missing name, businessNumber, industrySector, employeeCount
      };

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('필수 항목');
    });

    it('should reject invalid business number format', async () => {
      const invalidFormats = [
        '12345-67890',      // Wrong dash positions
        '123456789',        // No dashes
        '123-45-6789',      // Too short
        'abc-de-fghij',     // Non-numeric
      ];

      for (const invalidNumber of invalidFormats) {
        const organizationData = {
          ...sampleOrganizationData.company,
          businessNumber: invalidNumber,
        };

        const request = new NextRequest('http://localhost:3000/api/organizations', {
          method: 'POST',
          body: JSON.stringify(organizationData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('형식');
      }
    });

    it('should accept valid business number formats', async () => {
      const validFormats = [
        '123-45-67890',
        '000-00-00000',
        '999-99-99999',
      ];

      for (const validNumber of validFormats) {
        // Create new test user for each organization
        const newTestUser = await createTestUser({ email: `test-${Date.now()}-${validNumber}@example.com` });
        (getServerSession as jest.Mock).mockResolvedValue({
          user: {
            id: newTestUser.id,
            email: newTestUser.email,
            role: 'USER',
            organizationId: null,
          },
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        const organizationData = {
          ...sampleOrganizationData.company,
          businessNumber: validNumber,
          name: `Test Company ${validNumber}`,
        };

        const request = new NextRequest('http://localhost:3000/api/organizations', {
          method: 'POST',
          body: JSON.stringify(organizationData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
      }
    });
  });

  describe('Duplicate Prevention', () => {
    it('should reject duplicate business registration numbers', async () => {
      const businessNumber = generateTestBusinessNumber();
      const organizationData = {
        ...sampleOrganizationData.company,
        businessNumber,
      };

      // Create first organization
      const request1 = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(201);

      // Try to create duplicate with different user
      const testUser2 = await createTestUser({ email: `test2-${Date.now()}@example.com` });
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: testUser2.id,
          email: testUser2.email,
          role: 'USER',
          organizationId: null,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const request2 = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.error).toContain('이미 등록된');
    });

    it('should reject if user already has an organization', async () => {
      const businessNumber1 = generateTestBusinessNumber();
      const organizationData1 = {
        ...sampleOrganizationData.company,
        businessNumber: businessNumber1,
      };

      // Create first organization
      const request1 = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData1),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(201);

      // Try to create second organization with same user
      const businessNumber2 = generateTestBusinessNumber();
      const organizationData2 = {
        ...sampleOrganizationData.company,
        businessNumber: businessNumber2,
        name: 'Second Company',
      };

      const request2 = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData2),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.error).toContain('이미 조직 프로필이 존재');
    });
  });

  describe('Data Encryption (PIPA Compliance)', () => {
    it('should encrypt business registration number in database', async () => {
      const businessNumber = generateTestBusinessNumber();
      const organizationData = {
        ...sampleOrganizationData.company,
        businessNumber,
      };

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData),
      });

      const response = await POST(request);
      const data = await response.json();

      // Fetch from database
      const organization = await prisma.organizations.findUnique({
        where: { id: data.organization.id },
        select: {
          businessNumberEncrypted: true,
          businessNumberHash: true,
        },
      });

      expect(organization).toBeDefined();

      // Encrypted data should not contain plaintext
      expect(organization!.businessNumberEncrypted).not.toContain(businessNumber);

      // Should be in format: iv:authTag:encrypted
      expect(organization!.businessNumberEncrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

      // Hash should be deterministic SHA-256
      expect(organization!.businessNumberHash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(organization!.businessNumberHash)).toBe(true);

      // Should be able to decrypt
      const decrypted = decrypt(organization!.businessNumberEncrypted);
      expect(decrypted).toBe(businessNumber);
    });

    it('should store hash for duplicate detection without exposing plaintext', async () => {
      const businessNumber = generateTestBusinessNumber();
      const organizationData = {
        ...sampleOrganizationData.company,
        businessNumber,
      };

      const request = new NextRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify(organizationData),
      });

      const response = await POST(request);
      const data = await response.json();

      // Fetch organization
      const organization = await prisma.organizations.findUnique({
        where: { id: data.organization.id },
        select: {
          businessNumberHash: true,
          businessNumberEncrypted: true,
        },
      });

      // Hash should be present
      expect(organization!.businessNumberHash).toBeDefined();

      // Hash should not reveal original number
      expect(organization!.businessNumberHash).not.toContain(businessNumber);

      // Can't reverse hash to get original (one-way)
      expect(organization!.businessNumberHash.length).toBe(64);
    });
  });
});
