# Development Environment Setup

**Document Version:** 1.0  
**Last Updated:** October 13, 2025  
**Status:** Active

---

## Overview

This document describes the complete development environment setup for the Connect platform, including local development, testing, and debugging configurations.

---

## System Requirements

### 1. **Hardware**

| Component | Minimum | Recommended | Production Server |
|-----------|---------|-------------|-------------------|
| CPU | 4 cores | 8+ cores | **16 cores (i9-12900K)** |
| RAM | 8 GB | 16+ GB | **125 GB** |
| Storage | 50 GB SSD | 100+ GB NVMe | **954 GB NVMe + 9.1 TB HDD** |
| Network | 10 Mbps | 100+ Mbps | **740 Mbps (Internet) / 10 Gbps (Local)** |

### 2. **Software**

| Tool | Version | Required |
|------|---------|----------|
| Node.js | 20.x | ✅ |
| npm | 10.x | ✅ |
| Docker | 24.x | ✅ |
| Docker Compose | 2.x | ✅ |
| Git | 2.40+ | ✅ |
| PostgreSQL | 16.x | ⚠️ (via Docker) |
| Redis | 7.x | ⚠️ (via Docker) |

---

## Quick Start

### 1. **Clone Repository**

```bash
git clone https://github.com/your-org/connect.git
cd connect
```

### 2. **Install Dependencies**

```bash
# Install Node.js packages
npm install

# Generate Prisma client
npx prisma generate
```

### 3. **Start Development Services**

```bash
# Option A: Docker Compose (recommended)
docker-compose -f docker-compose.dev.yml up -d

# Option B: Local services (advanced)
./quick-start-no-docker.sh
```

### 4. **Initialize Database**

```bash
# Run migrations
npx prisma migrate dev

# Seed test data
npx tsx prisma/seed.ts
```

### 5. **Start Development Server**

```bash
npm run dev
```

**Server:** http://localhost:3000  
**Grafana:** http://localhost:3100  
**Prisma Studio:** `npx prisma studio`

---

## Environment Configuration

### 1. **Environment Files**

```bash
# Development
.env.development.local   # Local overrides (not in Git)
.env.development         # Shared dev config

# Production
.env.production.local    # Server-specific secrets (not in Git)
.env.production          # Shared prod config
```

### 2. **Required Variables**

```env
# Database
DATABASE_URL="postgresql://connect:password@localhost:5432/connect"
DATABASE_REPLICA_URL="postgresql://connect:password@localhost:5433/connect"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-change-in-production"

# OAuth Providers
KAKAO_CLIENT_ID="your_kakao_client_id"
KAKAO_CLIENT_SECRET="your_kakao_secret"
NAVER_CLIENT_ID="your_naver_client_id"
NAVER_CLIENT_SECRET="your_naver_secret"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@connect.co.kr"

# NTIS API
NTIS_API_KEY="your_ntis_api_key"
NTIS_BASE_URL="https://www.ntis.go.kr/api"

# Encryption
ENCRYPTION_KEY="32-byte-hex-key-for-AES-256-encryption"

# Feature Flags
ENABLE_MATCHING=true
ENABLE_NOTIFICATIONS=true
ENABLE_AI_FEATURES=true
```

### 3. **Generate Secrets**

```bash
# NEXTAUTH_SECRET (32-byte random string)
openssl rand -base64 32

# ENCRYPTION_KEY (32-byte hex for AES-256)
openssl rand -hex 32
```

---

## Docker Development Setup

### 1. **Docker Compose Configuration**

**File:** `docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: connect
      POSTGRES_PASSWORD: password
      POSTGRES_DB: connect
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U connect"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    environment:
      MH_STORAGE: maildir
      MH_MAILDIR_PATH: /maildir

volumes:
  postgres_data:
  redis_data:
```

### 2. **Start Services**

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Reset data
docker-compose -f docker-compose.dev.yml down -v
```

---

## Database Setup

### 1. **Migrations**

```bash
# Create migration
npx prisma migrate dev --name add_new_field

# Apply migrations
npx prisma migrate deploy

# Reset database (DEV ONLY)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

### 2. **Prisma Studio**

```bash
# Launch database GUI
npx prisma studio

# URL: http://localhost:5555
```

### 3. **Database Seeding**

```bash
# Run seed script
npx tsx prisma/seed.ts

# Seed creates:
# - 1 test organization (Test Company Ltd.)
# - 1 test user (kbj20415@gmail.com)
# - 12 funding programs (3 per agency: IITP, KEIT, TIPA, KIMST)
# - 5 sample matches
```

---

## Development Workflow

### 1. **File Structure**

```
connect/
├── app/                    # Next.js 13+ App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── components/        # Page-specific components
├── components/            # Shared components
│   ├── ui/               # Shadcn/UI components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                   # Business logic
│   ├── ai/               # AI/ML features
│   ├── auth/             # Authentication
│   ├── db/               # Database utilities
│   ├── email/            # Email templates
│   ├── matching/         # Matching algorithm
│   └── ntis-api/         # NTIS API client
├── prisma/               # Database schema
│   ├── schema.prisma     # Prisma schema
│   ├── migrations/       # Migration history
│   └── seed.ts           # Seed script
├── __tests__/            # Tests
│   ├── api/              # API tests
│   ├── e2e/              # End-to-end tests
│   └── lib/              # Unit tests
└── config/               # Infrastructure config
    ├── postgres/         # PostgreSQL config
    ├── redis/            # Redis config
    └── nginx/            # Nginx config
```

### 2. **Code Style**

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting (Prettier)
npm run format

# Run all checks
npm run validate
```

### 3. **Git Workflow**

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request
# (via GitHub UI)
```

**Commit Message Format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

---

## Testing

### 1. **Unit Tests (Jest)**

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test
npm test -- encryption.test.ts
```

### 2. **E2E Tests (Playwright)**

```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e

# Run in UI mode
npx playwright test --ui

# Generate report
npx playwright show-report
```

### 3. **API Tests**

```bash
# Run API tests
npm run test:api

# Test specific endpoint
npm test -- api/organizations.test.ts
```

### 4. **Test Configuration**

**Jest Config:** `jest.config.ts`
```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.d.ts'
  ]
};
```

**Playwright Config:** `playwright.config.ts`
```typescript
export default {
  testDir: '__tests__/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
  },
};
```

---

## Debugging

### 1. **VS Code Configuration**

**File:** `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Jest: current file",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${fileBasenameNoExtension}", "--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 2. **Logging**

```typescript
// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG]', data);
}

// Structured logging (recommended)
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId, email });
logger.error('Database error', { error, query });
logger.warn('Rate limit approaching', { userId, requests });
```

### 3. **Database Debugging**

```bash
# Enable query logging
DATABASE_URL="postgresql://connect:password@localhost:5432/connect?schema=public&options=-c%20log_statement=all"

# View slow queries
docker exec connect_postgres psql -U connect -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Monitor connections
docker exec connect_postgres psql -U connect -c "SELECT * FROM pg_stat_activity;"
```

---

## Performance Profiling

### 1. **Next.js Build Analysis**

```bash
# Analyze bundle size
npm run build
npm run analyze

# Profile build performance
NODE_OPTIONS='--inspect' npm run build
```

### 2. **React DevTools Profiler**

1. Install React DevTools extension
2. Navigate to Profiler tab
3. Click "Record"
4. Perform actions
5. Stop recording and analyze

### 3. **Lighthouse Audit**

```bash
# Install
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view

# CI mode
lighthouse http://localhost:3000 --output json --output-path ./lighthouse.json
```

---

## Common Issues

### 1. **Port Already in Use**

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

### 2. **Database Connection Failed**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View logs
docker logs connect_postgres

# Reset connection
docker restart connect_postgres
```

### 3. **Prisma Client Out of Sync**

```bash
# Regenerate Prisma client
npx prisma generate

# Reset and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

### 4. **Module Not Found**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## Developer Tools

### 1. **Recommended VS Code Extensions**

- **ESLint:** `dbaeumer.vscode-eslint`
- **Prettier:** `esbenp.prettier-vscode`
- **Prisma:** `Prisma.prisma`
- **Tailwind CSS IntelliSense:** `bradlc.vscode-tailwindcss`
- **GitLens:** `eamodio.gitlens`
- **Docker:** `ms-azuretools.vscode-docker`

### 2. **Browser Extensions**

- **React Developer Tools**
- **Redux DevTools** (if using Redux)
- **Axe DevTools** (accessibility)
- **Lighthouse**

### 3. **CLI Tools**

```bash
# Database management
npm install -g prisma

# Bundle analysis
npm install -g webpack-bundle-analyzer

# Performance testing
npm install -g autocannon
```

---

## References

- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Docker Docs:** https://docs.docker.com
- **TypeScript Handbook:** https://www.typescriptlang.org/docs

---

**Related Documents:**
- [BUILD-PROCESS.md](./BUILD-PROCESS.md)
- [CICD-PIPELINE.md](./CICD-PIPELINE.md)
- [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md)


