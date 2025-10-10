/**
 * Test Helpers and Fixtures
 *
 * Common utilities for testing authentication and database operations
 */

import { PrismaClient } from '@prisma/client';
import { encrypt, hashBusinessNumber } from '@/lib/encryption';

const prisma = new PrismaClient();

/**
 * Create a test user in the database
 */
export async function createTestUser(data?: {
  name?: string;
  email?: string;
  role?: string;
}) {
  const user = await prisma.user.create({
    data: {
      name: data?.name || 'Test User',
      email: data?.email || `test-${Date.now()}@example.com`,
      role: (data?.role as any) || 'USER',
    },
  });

  return user;
}

/**
 * Create a test organization in the database
 */
export async function createTestOrganization(data?: {
  type?: string;
  name?: string;
  businessNumber?: string;
  userId?: string;
}) {
  const businessNumber = data?.businessNumber || '123-45-67890';

  const organization = await prisma.organization.create({
    data: {
      type: (data?.type as any) || 'COMPANY',
      name: data?.name || 'Test Company',
      businessNumberEncrypted: encrypt(businessNumber),
      businessNumberHash: hashBusinessNumber(businessNumber),
      industrySector: 'ICT',
      employeeCount: 'FROM_10_TO_50',
      rdExperience: true,
      profileCompleted: true,
      profileScore: 80,
      status: 'ACTIVE',
      ...(data?.userId && {
        users: {
          connect: { id: data.userId },
        },
      }),
    },
  });

  return organization;
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData() {
  // Delete in order to avoid foreign key constraints
  await prisma.matchNotification.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test-',
        },
      },
    },
  });

  await prisma.fundingMatch.deleteMany({
    where: {
      organization: {
        name: {
          contains: 'Test',
        },
      },
    },
  });

  await prisma.auditLog.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test-',
        },
      },
    },
  });

  await prisma.payment.deleteMany({
    where: {
      subscription: {
        user: {
          email: {
            contains: 'test-',
          },
        },
      },
    },
  });

  await prisma.subscription.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test-',
        },
      },
    },
  });

  await prisma.session.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test-',
        },
      },
    },
  });

  await prisma.account.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test-',
        },
      },
    },
  });

  await prisma.organization.deleteMany({
    where: {
      name: {
        contains: 'Test',
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test-',
      },
    },
  });
}

/**
 * Mock NextAuth session for testing API routes
 */
export function mockSession(userId: string, email: string, role: string = 'USER') {
  return {
    user: {
      id: userId,
      name: 'Test User',
      email: email,
      role: role,
      organizationId: null,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
}

/**
 * Sample organization data for testing
 */
export const sampleOrganizationData = {
  company: {
    type: 'COMPANY',
    name: '(주)테크노베이션',
    businessNumber: '123-45-67890',
    businessStructure: 'CORPORATION',
    industrySector: 'ICT',
    employeeCount: 'FROM_10_TO_50',
    revenueRange: 'FROM_1B_TO_10B',
    rdExperience: true,
    technologyReadinessLevel: 5,
    description: '혁신적인 AI 기술을 개발하는 스타트업입니다',
  },
  researchInstitute: {
    type: 'RESEARCH_INSTITUTE',
    name: '한국혁신연구소',
    businessNumber: '456-78-91234',
    instituteType: 'GOVERNMENT_FUNDED',
    researchFocusAreas: ['AI', 'Robotics', 'IoT'],
    annualRdBudget: '10억원 이상',
    researcherCount: 50,
    keyTechnologies: ['Machine Learning', 'Computer Vision', 'NLP'],
    collaborationHistory: true,
    description: '정부 출연 AI 연구기관',
  },
};

/**
 * Wait for async operations (useful in tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate unique business registration number for tests
 */
export function generateTestBusinessNumber(): string {
  const random1 = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  const random2 = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');
  const random3 = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');

  return `${random1}-${random2}-${random3}`;
}
