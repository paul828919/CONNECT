/**
 * NTIS API Integration Validation Script
 *
 * Comprehensive validation of NTIS API setup, connectivity, and data flow
 * Run this before production deployment to ensure everything is configured correctly
 *
 * Usage: npx tsx scripts/validate-ntis-integration.ts
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ValidationResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

/**
 * Validation Tests
 */

async function validateEnvironmentVariables(): Promise<ValidationResult> {
  const requiredVars = [
    'NTIS_API_KEY',
    'DATABASE_URL',
  ];

  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'FAIL',
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
    };
  }

  return {
    name: 'Environment Variables',
    status: 'PASS',
    message: 'All required environment variables are set',
    details: {
      NTIS_API_KEY: process.env.NTIS_API_KEY?.substring(0, 10) + '...',
      DATABASE_URL: 'configured',
    },
  };
}

async function validateDependencies(): Promise<ValidationResult> {
  try {
    // Check if axios is installed
    const axiosModule = await import('axios');

    // Check if xml2js is installed
    const xml2jsModule = await import('xml2js');

    // Check if package.json has the dependencies
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const hasDependencies =
      packageJson.dependencies?.axios &&
      packageJson.dependencies?.xml2js &&
      packageJson.devDependencies?.['@types/xml2js'];

    if (!hasDependencies) {
      return {
        name: 'Dependencies',
        status: 'WARN',
        message: 'Dependencies are installed but not in package.json',
      };
    }

    return {
      name: 'Dependencies',
      status: 'PASS',
      message: 'All required dependencies are installed',
      details: {
        axios: packageJson.dependencies.axios,
        xml2js: packageJson.dependencies.xml2js,
        '@types/xml2js': packageJson.devDependencies['@types/xml2js'],
      },
    };
  } catch (error: any) {
    return {
      name: 'Dependencies',
      status: 'FAIL',
      message: `Dependency check failed: ${error.message}`,
    };
  }
}

async function validateNTISApiFiles(): Promise<ValidationResult> {
  const requiredFiles = [
    'lib/ntis-api/client.ts',
    'lib/ntis-api/parser.ts',
    'lib/ntis-api/scraper.ts',
    'lib/ntis-api/config.ts',
    'lib/ntis-api/types.ts',
    'lib/ntis-api/index.ts',
  ];

  const missingFiles = requiredFiles.filter(f => {
    const fullPath = path.join(process.cwd(), f);
    return !fs.existsSync(fullPath);
  });

  if (missingFiles.length > 0) {
    return {
      name: 'NTIS API Files',
      status: 'FAIL',
      message: `Missing implementation files: ${missingFiles.join(', ')}`,
    };
  }

  return {
    name: 'NTIS API Files',
    status: 'PASS',
    message: 'All NTIS API implementation files exist',
  };
}

async function validateDatabaseConnection(): Promise<ValidationResult> {
  try {
    await prisma.$connect();

    // Test query
    const programCount = await prisma.fundingProgram.count();

    return {
      name: 'Database Connection',
      status: 'PASS',
      message: 'Database connection successful',
      details: {
        totalPrograms: programCount,
      },
    };
  } catch (error: any) {
    return {
      name: 'Database Connection',
      status: 'FAIL',
      message: `Database connection failed: ${error.message}`,
    };
  }
}

async function validateNTISApiConnectivity(): Promise<ValidationResult> {
  try {
    const apiKey = process.env.NTIS_API_KEY;
    const baseUrl = 'https://www.ntis.go.kr/rndopen/openApi';

    // Test 1: Try the /public_project endpoint
    try {
      const response = await axios.get(`${baseUrl}/public_project`, {
        params: {
          apprvKey: apiKey,
          collection: 'project',
          SRWR: '',
          startPosition: 1,
          displayCnt: 1,
        },
        timeout: 10000,
      });

      return {
        name: 'NTIS API Connectivity',
        status: 'PASS',
        message: 'NTIS API is accessible and responding',
        details: {
          endpoint: '/public_project',
          statusCode: response.status,
        },
      };
    } catch (error: any) {
      // If /public_project fails, try alternative endpoints
      const alternativeEndpoints = [
        '/getRnDProjectInfo.do',
        '/public/project',
        '/project',
      ];

      for (const endpoint of alternativeEndpoints) {
        try {
          const altResponse = await axios.get(`${baseUrl}${endpoint}`, {
            params: {
              apprvKey: apiKey,
              SRWR: '',
            },
            timeout: 5000,
          });

          return {
            name: 'NTIS API Connectivity',
            status: 'WARN',
            message: `API accessible via alternative endpoint: ${endpoint}`,
            details: {
              originalEndpoint: '/public_project',
              workingEndpoint: endpoint,
              statusCode: altResponse.status,
              note: 'Update lib/ntis-api/client.ts with correct endpoint',
            },
          };
        } catch (altError) {
          // Continue trying other endpoints
        }
      }

      return {
        name: 'NTIS API Connectivity',
        status: 'FAIL',
        message: `NTIS API connectivity failed: ${error.response?.status || error.code}`,
        details: {
          error: error.message,
          statusCode: error.response?.status,
          possibleReasons: [
            'Demo API key may be expired or revoked',
            'API endpoint path may have changed',
            'API service may be temporarily unavailable',
            'Network connectivity issue',
          ],
          nextSteps: [
            'Verify API key is valid (check NTIS portal)',
            'Wait for production API key (Oct 14, 2025)',
            'Contact NTIS support: 042-869-1115',
          ],
        },
      };
    }
  } catch (error: any) {
    return {
      name: 'NTIS API Connectivity',
      status: 'FAIL',
      message: `Unexpected error during API test: ${error.message}`,
    };
  }
}

async function validateDataDeduplication(): Promise<ValidationResult> {
  try {
    // Check if there are any duplicate content hashes in the database
    const duplicates = await prisma.$queryRaw<any[]>`
      SELECT "contentHash", COUNT(*) as count
      FROM "FundingProgram"
      WHERE "contentHash" IS NOT NULL
      GROUP BY "contentHash"
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length > 0) {
      return {
        name: 'Data Deduplication',
        status: 'WARN',
        message: `Found ${duplicates.length} duplicate content hashes`,
        details: {
          duplicates: duplicates.slice(0, 5), // Show first 5
        },
      };
    }

    return {
      name: 'Data Deduplication',
      status: 'PASS',
      message: 'No duplicate programs found - deduplication working correctly',
    };
  } catch (error: any) {
    return {
      name: 'Data Deduplication',
      status: 'FAIL',
      message: `Deduplication check failed: ${error.message}`,
    };
  }
}

async function validateNTISDataQuality(): Promise<ValidationResult> {
  try {
    const ntisPrograms = await prisma.fundingProgram.findMany({
      where: {
        scrapingSource: 'NTIS_API',
      },
      take: 10,
      orderBy: {
        scrapedAt: 'desc',
      },
    });

    if (ntisPrograms.length === 0) {
      return {
        name: 'NTIS Data Quality',
        status: 'WARN',
        message: 'No NTIS API programs found in database',
        details: {
          note: 'Run npx tsx scripts/trigger-ntis-scraping.ts to populate data',
        },
      };
    }

    // Check data completeness
    const issues = [];
    let completeCount = 0;

    for (const program of ntisPrograms) {
      const isComplete = program.title && program.description && program.agencyId;
      if (isComplete) completeCount++;
      else {
        issues.push({
          id: program.id,
          missingFields: {
            title: !program.title,
            description: !program.description,
            agencyId: !program.agencyId,
          },
        });
      }
    }

    const completeness = (completeCount / ntisPrograms.length) * 100;

    if (completeness < 80) {
      return {
        name: 'NTIS Data Quality',
        status: 'WARN',
        message: `Data quality issues: ${completeness.toFixed(1)}% complete`,
        details: {
          totalPrograms: ntisPrograms.length,
          completePrograms: completeCount,
          issues: issues.slice(0, 3),
        },
      };
    }

    return {
      name: 'NTIS Data Quality',
      status: 'PASS',
      message: `Data quality good: ${completeness.toFixed(1)}% complete`,
      details: {
        totalPrograms: ntisPrograms.length,
        completePrograms: completeCount,
      },
    };
  } catch (error: any) {
    return {
      name: 'NTIS Data Quality',
      status: 'FAIL',
      message: `Data quality check failed: ${error.message}`,
    };
  }
}

/**
 * Main validation runner
 */

async function runValidation() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 NTIS API Integration Validation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Run all validations
  const validations = [
    validateEnvironmentVariables(),
    validateDependencies(),
    validateNTISApiFiles(),
    validateDatabaseConnection(),
    validateNTISApiConnectivity(),
    validateDataDeduplication(),
    validateNTISDataQuality(),
  ];

  for (const validation of validations) {
    const result = await validation;
    results.push(result);

    // Print result
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);

    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  }

  // Summary
  const passCount = results.filter(r => r.status === 'PASS').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Validation Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ⚠️  Warnings: ${warnCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('');

  if (failCount === 0 && warnCount === 0) {
    console.log('🎉 All validations passed! NTIS API integration is ready.');
  } else if (failCount === 0) {
    console.log('✅ NTIS API integration is functional with some warnings.');
  } else {
    console.log('❌ NTIS API integration has critical issues that need resolution.');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await prisma.$disconnect();

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run validation
runValidation().catch((error) => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
});
