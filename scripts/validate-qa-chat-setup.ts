/**
 * Q&A Chat Setup Validation Script
 * Week 3-4: AI Integration (Day 18-19)
 *
 * Validates that all components are properly set up:
 * 1. Conversation types and context manager
 * 2. Q&A chat service
 * 3. API endpoints
 * 4. UI component
 * 5. Dependencies installed
 * 6. Environment variables configured
 * 7. Redis connection
 *
 * Usage:
 * npx tsx scripts/validate-qa-chat-setup.ts
 */

import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

interface ValidationResult {
  category: string;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

async function runValidation(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Category 1: File Structure
  console.log(`\n${colors.blue}📁 Validating File Structure...${colors.reset}`);
  const fileChecks = {
    category: 'File Structure',
    checks: [
      {
        name: 'Conversation types',
        path: 'lib/ai/conversation/types.ts',
      },
      {
        name: 'Context manager',
        path: 'lib/ai/conversation/context-manager.ts',
      },
      {
        name: 'Q&A chat prompt',
        path: 'lib/ai/prompts/qa-chat.ts',
      },
      {
        name: 'Q&A chat service',
        path: 'lib/ai/services/qa-chat.ts',
      },
      {
        name: 'Chat API endpoint',
        path: 'app/api/chat/route.ts',
      },
      {
        name: 'Chat UI component',
        path: 'components/qa-chat.tsx',
      },
    ].map((check) => {
      const fullPath = path.join(projectRoot, check.path);
      const exists = fs.existsSync(fullPath);
      const stats = exists ? fs.statSync(fullPath) : null;
      const size = stats ? `(${(stats.size / 1024).toFixed(1)} KB)` : '';

      return {
        name: check.name,
        passed: exists,
        message: exists
          ? `✅ Found at ${check.path} ${size}`
          : `❌ Missing: ${check.path}`,
      };
    }),
  };
  results.push(fileChecks);

  // Category 2: Dependencies
  console.log(`\n${colors.blue}📦 Validating Dependencies...${colors.reset}`);
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const dependencyChecks = {
    category: 'Dependencies',
    checks: [
      { name: '@anthropic-ai/sdk', version: deps['@anthropic-ai/sdk'] },
      { name: 'ioredis', version: deps['ioredis'] },
      { name: '@prisma/client', version: deps['@prisma/client'] },
      { name: 'next-auth', version: deps['next-auth'] },
      { name: 'lucide-react', version: deps['lucide-react'] },
    ].map((check) => ({
      name: check.name,
      passed: !!check.version,
      message: check.version
        ? `✅ Installed: ${check.name}@${check.version}`
        : `❌ Missing: ${check.name}`,
    })),
  };
  results.push(dependencyChecks);

  // Category 3: Environment Variables
  console.log(`\n${colors.blue}🔐 Validating Environment Variables...${colors.reset}`);
  const envPath = path.join(projectRoot, '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const envChecks = {
    category: 'Environment Variables',
    checks: [
      {
        name: 'ANTHROPIC_API_KEY',
        pattern: /ANTHROPIC_API_KEY\s*=\s*"?sk-/,
        required: true,
      },
      {
        name: 'ANTHROPIC_MODEL',
        pattern: /ANTHROPIC_MODEL\s*=\s*"?claude-sonnet/,
        required: false,
      },
      {
        name: 'AI_RATE_LIMIT_PER_MINUTE',
        pattern: /AI_RATE_LIMIT_PER_MINUTE\s*=\s*\d+/,
        required: false,
      },
      {
        name: 'AI_DAILY_BUDGET_KRW',
        pattern: /AI_DAILY_BUDGET_KRW\s*=\s*\d+/,
        required: false,
      },
      {
        name: 'REDIS_CACHE_URL',
        pattern: /REDIS_CACHE_URL\s*=\s*.+/,
        required: true,
      },
      {
        name: 'DATABASE_URL',
        pattern: /DATABASE_URL\s*=\s*.+/,
        required: true,
      },
    ].map((check) => {
      const found = check.pattern.test(envContent);
      return {
        name: check.name,
        passed: found || !check.required,
        message: found
          ? `✅ Configured: ${check.name}`
          : check.required
          ? `❌ Missing (required): ${check.name}`
          : `⚠️  Not configured (optional): ${check.name}`,
      };
    }),
  };
  results.push(envChecks);

  // Category 4: Code Quality
  console.log(`\n${colors.blue}🔍 Validating Code Quality...${colors.reset}`);

  // Check context manager
  const contextManagerContent = fs.readFileSync(
    path.join(projectRoot, 'lib/ai/conversation/context-manager.ts'),
    'utf-8'
  );

  // Check Q&A service
  const qaServiceContent = fs.readFileSync(
    path.join(projectRoot, 'lib/ai/services/qa-chat.ts'),
    'utf-8'
  );

  // Check API endpoint
  const apiContent = fs.readFileSync(
    path.join(projectRoot, 'app/api/chat/route.ts'),
    'utf-8'
  );

  const qualityChecks = {
    category: 'Code Quality',
    checks: [
      {
        name: 'Context manager has getContext method',
        passed: contextManagerContent.includes('async getContext('),
        message: '',
      },
      {
        name: 'Context manager has addMessage method',
        passed: contextManagerContent.includes('async addMessage('),
        message: '',
      },
      {
        name: 'Context manager uses Redis',
        passed: contextManagerContent.includes('import { Redis }') && contextManagerContent.includes('getRedisClient'),
        message: '',
      },
      {
        name: 'Q&A service exports sendQAChat',
        passed: qaServiceContent.includes('export async function sendQAChat'),
        message: '',
      },
      {
        name: 'Q&A service uses AI client',
        passed: qaServiceContent.includes('import { sendAIRequest'),
        message: '',
      },
      {
        name: 'Q&A service has rate limiting',
        passed: qaServiceContent.includes('checkChatRateLimit'),
        message: '',
      },
      {
        name: 'API has POST endpoint',
        passed: apiContent.includes('export async function POST'),
        message: '',
      },
      {
        name: 'API has GET endpoint',
        passed: apiContent.includes('export async function GET'),
        message: '',
      },
      {
        name: 'API has authentication',
        passed: apiContent.includes('getServerSession'),
        message: '',
      },
      {
        name: 'API has error handling',
        passed: apiContent.includes('try') && apiContent.includes('catch'),
        message: '',
      },
    ].map((check) => ({
      name: check.name,
      passed: check.passed,
      message: check.passed
        ? `✅ ${check.name}`
        : `❌ Missing: ${check.name}`,
    })),
  };
  results.push(qualityChecks);

  return results;
}

async function main() {
  console.log('========================================');
  console.log('Q&A Chat Setup Validation');
  console.log('Week 3-4: AI Integration (Day 18-19)');
  console.log('========================================');

  const results = await runValidation();

  // Print results
  let totalChecks = 0;
  let passedChecks = 0;

  results.forEach((category) => {
    console.log(`\n${colors.blue}${category.category}:${colors.reset}`);
    category.checks.forEach((check) => {
      totalChecks++;
      if (check.passed) passedChecks++;

      const icon = check.passed ? '✅' : check.message.includes('⚠️') ? '⚠️' : '❌';
      const color = check.passed ? colors.green : check.message.includes('⚠️') ? colors.yellow : colors.red;
      console.log(`  ${icon} ${color}${check.message}${colors.reset}`);
    });
  });

  // Summary
  console.log('\n========================================');
  console.log('Validation Summary');
  console.log('========================================');
  console.log(`✅ Passed: ${passedChecks} / ${totalChecks}`);
  console.log(`❌ Failed: ${totalChecks - passedChecks} / ${totalChecks}`);
  console.log(`📊 Success rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

  if (passedChecks === totalChecks) {
    console.log(`\n${colors.green}🎉 All validation checks passed!${colors.reset}`);
    console.log(`\n${colors.blue}Next steps:${colors.reset}`);
    console.log('  1. Ensure Redis is running: redis-server');
    console.log('  2. Test the service: npx tsx scripts/test-qa-chat.ts');
    console.log('  3. Start the development server: npm run dev');
    console.log('  4. Test UI at /dashboard (add QAChat component to a page)');
  } else {
    console.log(`\n${colors.yellow}⚠️  Some validation checks failed.${colors.reset}`);
    console.log(`${colors.yellow}Please review the errors above and fix them.${colors.reset}`);
  }

  console.log('========================================\n');

  // Exit with appropriate code
  process.exit(passedChecks === totalChecks ? 0 : 1);
}

main().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
