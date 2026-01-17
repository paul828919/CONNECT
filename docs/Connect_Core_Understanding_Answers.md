# Connect Core Understanding - Answer Document

> This document provides comprehensive answers to the Connect Core Understanding Question List.
> Based on codebase analysis conducted on December 1, 2025.

---

## 1. Technology Stack and Architecture Overview

### Question 1: Stack in Use (Frontend / Backend / Database)

**[Answer]**

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js (React) | 14.2.5 |
| | React | 18.3.1 |
| | TailwindCSS | 3.4.7 |
| | Shadcn/UI (Radix UI primitives) | Multiple @radix-ui/* |
| | Framer Motion | 11.3.21 |
| | React Query (@tanstack/react-query) | 5.51.23 |
| | Zustand (state management) | 4.5.4 |
| | Recharts (data visualization) | 2.12.7 |
| **Backend** | Next.js API Routes | 14.2.5 |
| | Node.js | >=20.0.0 |
| | Prisma ORM | 6.19.0 |
| | NextAuth.js | 4.24.12 |
| | BullMQ (job queue) | 5.12.0 |
| | Nodemailer | 7.0.7 |
| **Database** | PostgreSQL | 15 (Alpine) |
| | Redis (cache) | 7 (Alpine) |
| | Redis (queue) | 7 (Alpine) |

---

### Question 2: Overall Architecture Structure

**[Answer]**

Connect uses a **monolithic Next.js architecture** with containerized microservices for background processing:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Production Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌─────────────────────────────┐   │
│  │  app1    │    │  app2    │    │     Nginx (Reverse Proxy)   │   │
│  │ :3001    │    │ :3002    │    │     SSL/Load Balancing      │   │
│  └────┬─────┘    └────┬─────┘    └─────────────────────────────┘   │
│       │               │                        ▲                     │
│       └───────┬───────┘                        │                     │
│               │                                │                     │
│               ▼                                │                     │
│  ┌────────────────────────────────────────────┴──────────────────┐  │
│  │                     Docker Network (172.25.0.0/16)            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│               │                                                      │
│       ┌───────┴───────┬────────────────┬──────────────┐            │
│       ▼               ▼                ▼              ▼            │
│  ┌─────────┐   ┌─────────────┐  ┌────────────┐  ┌──────────┐      │
│  │PostgreSQL│   │ Redis Cache │  │Redis Queue │  │ Scraper  │      │
│  │  :5432   │   │   :6379     │  │   :6379    │  │ Worker   │      │
│  │ 172.25.  │   │ 172.25.0.50 │  │172.25.0.51 │  │172.25.   │      │
│  │  0.40    │   │ (11GB LRU)  │  │(2GB AOF)   │  │ 0.60     │      │
│  └─────────┘   └─────────────┘  └────────────┘  └──────────┘      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Grafana Monitoring (:3100)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Components:**
1. **Web Application (app1/app2)**: Dual Next.js instances for blue-green deployment and high availability
2. **Scraper Worker**: Dedicated container for NTIS API integration and web scraping
3. **PostgreSQL**: Primary data store with extensive performance tuning (8GB shared buffers)
4. **Redis Cache**: LRU-eviction cache for matches, programs, and session data (11GB)
5. **Redis Queue**: Persistent AOF-backed queue for BullMQ job processing (2GB)
6. **Grafana**: Monitoring and alerting dashboard

---

### Question 3: Frameworks and Libraries

**[Answer]**

**Core Frameworks:**
- **Next.js 14.2.5**: Full-stack React framework with App Router
- **React 18.3.1**: UI library with server components support
- **Prisma 6.19.0**: Type-safe ORM for PostgreSQL

**UI/Frontend Libraries:**
| Library | Purpose |
|---------|---------|
| TailwindCSS 3.4.7 | Utility-first CSS framework |
| Radix UI (@radix-ui/*) | Accessible component primitives (15+ packages) |
| Framer Motion 11.3.21 | Animation library |
| Lucide React 0.424.0 | Icon library |
| React Hook Form 7.52.2 | Form management |
| Zod 3.23.8 | Schema validation |
| cmdk 1.0.0 | Command palette |

**Backend/Infrastructure Libraries:**
| Library | Purpose |
|---------|---------|
| NextAuth.js 4.24.12 | Authentication (OAuth) |
| ioredis 5.4.1 | Redis client |
| BullMQ 5.12.0 | Job queue management |
| Nodemailer 7.0.7 | Email sending |
| Axios 1.7.2 | HTTP client |
| bcryptjs 2.4.3 | Password hashing |
| jose 5.6.3 | JWT handling |

**AI/ML Integration:**
| Library | Purpose |
|---------|---------|
| @anthropic-ai/sdk 0.65.0 | Claude AI integration for match explanations |

**Data Processing:**
| Library | Purpose |
|---------|---------|
| date-fns 3.6.0 | Date manipulation |
| fast-xml-parser 5.3.0 | XML parsing for NTIS API |
| pdf-parse 1.1.1 | PDF text extraction |
| tesseract.js 6.0.1 | OCR for Korean documents |
| adm-zip 0.5.16 | ZIP file handling |

**Payment:**
| Library | Purpose |
|---------|---------|
| Stripe 16.5.0 | Payment processing (legacy/alternative) |
| Toss Payments | Primary Korean payment gateway (custom integration) |

---

## 2. Infrastructure / Deployment Architecture

### Question 4: Infrastructure & Runtime Environment

**[Answer]**

**Server Environment:**
| Component | Specification |
|-----------|---------------|
| OS | Linux (Ubuntu) - x86_64/amd64 |
| Hardware | i9-12900K (16 cores), 128GB RAM |
| Domain | connectplt.kr |
| SSL | HTTPS enforced (Let's Encrypt via Nginx) |
| IP | 59.21.170.6 (production server) |

**Container Runtime:**
- **Docker** with Docker Compose orchestration
- **Multi-stage Dockerfile** for optimized production images
- **Entrypoint pattern** for self-healing container initialization

**Reverse Proxy:**
- **Nginx** handles SSL termination, load balancing between app1/app2
- Static asset caching and gzip compression
- Rate limiting at proxy level

**Resource Allocation (docker-compose.production.yml):**
| Service | CPU Limit | Memory Limit |
|---------|-----------|--------------|
| app1/app2 | 4 cores | 10GB each |
| PostgreSQL | 4 cores | 32GB |
| Redis Cache | 2 cores | 12GB |
| Redis Queue | 1 core | 3GB |
| Scraper | 2 cores | 4GB |
| Grafana | 1 core | 2GB |

---

### Question 5: Environment Separation (Local / Staging / Production)

**[Answer]**

**Environment Files:**
| Environment | Config File | Database | Redis |
|-------------|-------------|----------|-------|
| Local/Development | `.env.local` | localhost:5432 | localhost:6379 |
| Production | `.env.production` | Docker network postgres:5432 | redis-cache:6379, redis-queue:6379 |

**Key Differences:**

1. **Database:**
   - Local: Direct PostgreSQL connection (local or Docker)
   - Production: Connection pooling via Docker network with optimized settings

2. **Redis:**
   - Local: Single Redis instance
   - Production: Dual Redis (cache with LRU eviction + queue with AOF persistence)

3. **Docker Compose:**
   - Local: `docker-compose.yml` (simplified)
   - Production: `docker-compose.production.yml` (full stack with resource limits)

4. **Environment Variables:**
   - Production secrets managed via GitHub Secrets
   - `.env.production` auto-generated during CI/CD deployment
   - ENCRYPTION_KEY for PIPA-compliant data encryption

**Note:** Staging environment is not currently implemented; production uses blue-green deployment strategy.

---

### Question 6: Deployment Pipeline (CI/CD)

**[Answer]**

**Tool:** GitHub Actions (`.github/workflows/deploy-production.yml`)

**Pipeline Stages:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD Pipeline                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Push to main  ──►  TEST  ──►  BUILD  ──►  DEPLOY  ──►  VERIFY     │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │   Test   │    │  Build   │    │  Deploy  │    │  Health  │      │
│  │   Job    │    │  Docker  │    │  to Prod │    │  Check   │      │
│  ├──────────┤    ├──────────┤    ├──────────┤    ├──────────┤      │
│  │• npm ci  │    │• Buildx  │    │• SSH to  │    │• curl    │      │
│  │• Prisma  │    │• Multi-  │    │  server  │    │  /api/   │      │
│  │  generate│    │  platform│    │• Load    │    │  health  │      │
│  │• npm test│    │• Verify  │    │  images  │    │• Retry   │      │
│  │• npm lint│    │  scripts │    │• Blue-   │    │  36x     │      │
│  │          │    │  in image│    │  Green   │    │  (3min)  │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│        │               │               │               │            │
│        ▼               ▼               ▼               ▼            │
│     Success?        Success?        Success?        Success?        │
│        │               │               │               │            │
│   ┌────┴────┐    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐        │
│   │  Fail   │    │  Fail   │    │Rollback │    │ Notify  │        │
│   │  Early  │    │  Early  │    │         │    │ Success │        │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Test Stage:**
   - PostgreSQL 16 and Redis 7 service containers
   - Prisma schema validation
   - Jest unit tests
   - ESLint linting

2. **Build Stage:**
   - Docker Buildx with cross-platform support (linux/amd64)
   - Separate images for app and scraper
   - Script directory verification in images
   - GitHub Actions cache for faster builds

3. **Deploy Stage:**
   - SSH key authentication (no passwords)
   - Blue-green deployment (app2 first, then app1)
   - Auto-generated `.env.production` from GitHub Secrets
   - 180-second health check timeout per instance

4. **Rollback:**
   - Automatic rollback on failure
   - Restart previous containers

**Trigger Conditions:**
- Push to `main` branch
- Manual workflow dispatch (with optional skip_tests for emergencies)

---

## 3. Domain Model / Data Structure

### Question 7: Core Domain Model Structure

**[Answer]**

**Prisma Schema Overview (30+ models, 25+ enums):**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Core Domain Models                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐        ┌─────────────────────┐                    │
│  │    User      │◄───────│     Account         │  (OAuth)           │
│  │  (users)     │        │   (accounts)        │                    │
│  ├──────────────┤        └─────────────────────┘                    │
│  │ id           │                                                   │
│  │ email        │        ┌─────────────────────┐                    │
│  │ name         │◄───────│    Session          │  (NextAuth)        │
│  │ role (enum)  │        │   (sessions)        │                    │
│  │ organizationId│       └─────────────────────┘                    │
│  └──────┬───────┘                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐        ┌─────────────────────┐                    │
│  │ organizations │◄──────│   funding_matches   │                    │
│  ├──────────────┤        ├─────────────────────┤                    │ 
│  │ id           │        │ organizationId      │                    │
│  │ type (enum)  │        │ programId           │                    │
│  │ name         │        │ score (0-100)       │                    │
│  │ businessNum* │        │ explanation (JSON)  │                    │
│  │ industrySector│       │ viewed, saved       │                    │
│  │ trl (1-9)    │        └─────────────────────┘                    │
│  │ rdExperience │                 │                                 │
│  │ certifications│                ▼                                 │
│  └──────────────┘        ┌─────────────────────┐                    │
│         │                │  funding_programs   │                    │
│         │                ├─────────────────────┤                    │
│         │                │ id                  │                    │
│         │                │ agencyId (enum)     │                    │
│         │                │ title               │                    │
│         │                │ deadline            │                    │
│         │                │ targetType[]        │                    │
│         │                │ minTrl, maxTrl      │                    │
│         │                │ budgetAmount        │                    │
│         │                │ keywords[]          │                    │
│         │                │ status (enum)       │                    │
│         │                └─────────────────────┘                    │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐        ┌─────────────────────┐                    │
│  │subscriptions │◄───────│     payments        │                    │
│  ├──────────────┤        ├─────────────────────┤                    │
│  │ plan (enum)  │        │ tossPaymentKey      │                    │
│  │ status       │        │ amount              │                    │
│  │ billingCycle │        │ status              │                    │
│  │ tossBillingKey│       │ taxInvoiceIssued    │                    │
│  └──────────────┘        └─────────────────────┘                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Enums:**
- `UserRole`: USER, ADMIN, SUPER_ADMIN
- `OrganizationType`: COMPANY, RESEARCH_INSTITUTE
- `SubscriptionPlan`: FREE, PRO, TEAM
- `AgencyId`: IITP, KEIT, TIPA, KIMST, NTIS
- `ProgramStatus`: ACTIVE, EXPIRED, ARCHIVED

**Important Indexes (from schema.prisma):**
- `organizations`: businessNumberHash, type, status, profileCompleted
- `funding_programs`: agencyId, deadline, status, targetType
- `funding_matches`: organizationId+score (composite), programId, viewed, saved

**Encrypted Fields (PIPA Compliance):**
- `organizations.businessNumberEncrypted`: AES-256-GCM encrypted
- `organizations.businessNumberHash`: SHA-256 hash for searching

---

### Question 8: Matching Logic & Algorithm

**[Answer]**

**Location:** `lib/matching/algorithm.ts`

**Scoring Breakdown (0-100 points):**

| Category | Max Points | Logic |
|----------|------------|-------|
| Industry/Keyword Alignment | 30 | Taxonomy-based cross-industry relevance + Korean synonym matching |
| TRL Compatibility | 20 | Graduated scoring (exact match: 20, ±1: 12-15, ±2: 6-10) |
| Organization Type Match | 20 | COMPANY/RESEARCH_INSTITUTE targeting |
| R&D Experience | 15 | rdExperience (10) + collaborationCount (2-5) |
| Deadline Proximity | 15 | Urgent (≤7d): 15, Soon (≤30d): 12, Moderate (≤60d): 8 |

**Hard Requirement Filters (Pre-Scoring):**
1. **Program Status**: Must be ACTIVE (not EXPIRED)
2. **Deadline**: Must be in the future
3. **Organization Type**: Must match program's targetType
4. **Business Structure**: Must match allowedBusinessStructures if specified
5. **TRL Range**: Organization TRL must be within program's minTrl-maxTrl
6. **Industry Compatibility**: Cross-industry relevance score ≥ 0.3
7. **Hospital-Only Programs**: Medical programs excluded for companies

**Eligibility Three-Tier Classification (Phase 2):**
- `FULLY_ELIGIBLE`: All requirements met
- `CONDITIONALLY_ELIGIBLE`: Soft requirements not met (shown with warnings)
- `INELIGIBLE`: Hard requirements failed (excluded from results)

**Algorithm Flow:**
```typescript
function generateMatches(organization, programs, limit = 3): MatchScore[] {
  // 1. Filter by hard requirements
  // 2. Check eligibility (three-tier)
  // 3. Calculate score for each dimension
  // 4. Sort by eligibility level, then score
  // 5. Return top N matches
}
```

---

## 4. Authentication / Authorization / Security

### Question 9: Authentication Mechanism

**[Answer]**

**Framework:** NextAuth.js 4.24.12 with Prisma Adapter

**OAuth Providers:**
| Provider | Endpoints |
|----------|-----------|
| Kakao | kauth.kakao.com (OAuth 2.0) |
| Naver | nid.naver.com (OAuth 2.0) |

**Session Strategy:** JWT (not database sessions)
- `maxAge`: 30 days
- Secure cookies in production (`__Secure-` prefix)
- HttpOnly, SameSite=Lax

**Authentication Flow:**
```
┌───────────────────────────────────────────────────────────────────┐
│                    OAuth Authentication Flow                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  User clicks        Redirect to         User authorizes           │
│  "Login with   ──►  Kakao/Naver    ──►  and grants              │
│   Kakao/Naver"      OAuth page          permissions               │
│                                                                    │
│       │                                       │                    │
│       │                                       ▼                    │
│       │                              Callback to /api/auth/       │
│       │                              callback/{provider}          │
│       │                                       │                    │
│       │                                       ▼                    │
│       │                              Exchange code for           │
│       │                              access_token                 │
│       │                                       │                    │
│       │                                       ▼                    │
│       │                              Fetch user profile           │
│       │                              from provider API            │
│       │                                       │                    │
│       │                                       ▼                    │
│       │                              Create/Update User           │
│       │                              in database                  │
│       │                                       │                    │
│       │                                       ▼                    │
│       │                              Issue JWT session            │
│       │                              token (30 days)              │
│       │                                       │                    │
│       ▼                                       ▼                    │
│  Redirect to dashboard with session cookie set                    │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

**Session Refresh:** JWT callbacks update organizationId on `trigger === 'update'`

---

### Question 10: Authorization Structure

**[Answer]**

**User Roles (UserRole enum):**
| Role | Permissions |
|------|-------------|
| USER | Access own organization data, view matches, manage profile |
| ADMIN | USER + view all organizations, manage users |
| SUPER_ADMIN | ADMIN + system configuration, delete any data |

**Route Protection:**

1. **Middleware-Level (`middleware.ts`):**
   - Protects `/dashboard/*` routes
   - Checks for NextAuth session cookie
   - Redirects unauthenticated users to `/auth/signin`

2. **API-Level:**
   - `getServerSession(authOptions)` validation
   - Role checking via `session.user.role`
   - Organization ownership verification via `session.user.organizationId`

**Protected Features by Role:**
| Feature | USER | ADMIN | SUPER_ADMIN |
|---------|------|-------|-------------|
| View own matches | ✓ | ✓ | ✓ |
| Generate matches | ✓ | ✓ | ✓ |
| View all users | ✗ | ✓ | ✓ |
| Clear all matches | ✗ | ✓ | ✓ |
| Access admin dashboard | ✗ | ✓ | ✓ |
| System configuration | ✗ | ✗ | ✓ |

---

### Question 11: Security Policies and Protections

**[Answer]**

**1. Password Handling:**
- bcryptjs for password hashing (OAuth users don't have passwords)
- No plain-text password storage

**2. Sensitive Data Encryption (`lib/encryption.ts`):**
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Target:** Business registration numbers (사업자등록번호)
- **Format:** `iv:authTag:encrypted` (all hex-encoded)
- **Key Rotation:** Recommended every 90 days via `rotateKey()` utility
- **Search:** SHA-256 hash stored for lookup without decryption

**3. HTTPS Enforcement:**
- Nginx SSL termination
- `secure: true` on production cookies
- HSTS headers

**4. CORS Configuration:**
- Next.js default CORS (same-origin)
- API routes protected by same-origin policy

**5. Rate Limiting:**
- AI API: `AI_RATE_LIMIT_PER_MINUTE=50`
- Daily budget: `AI_DAILY_BUDGET_KRW=50000`
- Scraper: `RATE_LIMIT_PER_MINUTE=10`
- Nginx-level rate limiting available

**6. Input Validation:**
- Zod schema validation on API inputs
- React Hook Form + Zod on frontend
- Prisma's type-safe queries prevent SQL injection

**7. Audit Logging:**
- `audit_logs` table for PIPA compliance
- Tracks user actions, IP addresses, user agents
- Decryption access logging for sensitive data

---

## 5. Performance / Caching / Scalability

### Question 12: Caching Strategy (Redis)

**[Answer]**

**Dual Redis Architecture:**

| Instance | Purpose | Memory | Eviction Policy |
|----------|---------|--------|-----------------|
| redis-cache (172.25.0.50) | Data caching | 11GB | allkeys-lru |
| redis-queue (172.25.0.51) | Job queue (BullMQ) | 2GB | noeviction |

**Cached Data Types:**
| Data | TTL | Key Pattern |
|------|-----|-------------|
| Match results | Variable | `match:{orgId}:{programId}` |
| Program listings | 1 hour | `programs:active:list` |
| User sessions | 30 days | `session:{token}` |
| Active user stats | 24 hours | `active_user:{date}` |

**Cache Configuration (from docker-compose.production.yml):**
```
redis-server
--maxmemory 11gb
--maxmemory-policy allkeys-lru
--save ""           # No persistence for cache
--appendonly no
```

**Queue Configuration:**
```
redis-server
--maxmemory 2gb
--maxmemory-policy noeviction    # Jobs must not be evicted
--appendonly yes                 # AOF persistence
--appendfsync everysec
```

---

### Question 13: Performance and Scalability Design

**[Answer]**

**Database Optimization:**

1. **PostgreSQL Tuning (docker-compose.production.yml):**
   - `shared_buffers`: 8GB
   - `effective_cache_size`: 20GB
   - `work_mem`: 32MB
   - `max_connections`: 200
   - `max_parallel_workers`: 4

2. **Indexes (schema.prisma):**
   - Composite indexes on frequently queried columns
   - 50+ indexes defined across all models
   - Example: `@@index([organizationId, score])` on funding_matches

3. **Connection Pooling:**
   - Prisma connection pooling (`connection_limit=50`, `pool_timeout=30`)

**Application Scalability:**

1. **Horizontal Scaling:**
   - Dual app instances (app1, app2)
   - Stateless design (JWT sessions, no sticky sessions)
   - Shared Redis for cross-instance cache

2. **Blue-Green Deployment:**
   - Zero-downtime updates
   - Automatic rollback on failure

3. **Async Job Processing:**
   - BullMQ for background tasks
   - Dedicated scraper container
   - Job prioritization

4. **Resource Limits:**
   - Container CPU/memory limits prevent resource exhaustion
   - Node.js `--max-old-space-size=8192` for large memory operations

---

## 6. Logging / Monitoring / Incident Response

### Question 14: Logging Design and Collection

**[Answer]**

**Log Levels:**
- `console.log`: General information
- `console.error`: Error conditions
- `console.warn`: Warnings

**Log Categories:**

| Category | Content | Location |
|----------|---------|----------|
| Application logs | Request handling, business events | `./logs/app1/`, `./logs/app2/` |
| PostgreSQL logs | Query logs (>1000ms), errors | `./logs/postgres/` |
| Scraper logs | Scraping jobs, NTIS API calls | `./logs/scraper/` |
| Audit logs | User actions, security events | `audit_logs` table |
| AI cost logs | Claude API usage, costs | `ai_cost_logs` table |

**Log Format:**
- Docker JSON logging driver
- PostgreSQL: `'%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '`

**Log Rotation:**
- Docker: `max-size: 10m`, `max-file: 3` per container
- PostgreSQL: Daily files (`postgresql-%Y-%m-%d.log`)

**Structured Logging Tables:**
- `scraping_logs`: Scraping job results, success rates
- `extraction_logs`: Data extraction details, confidence levels
- `ai_cost_logs`: Token usage, cost tracking per service type

---

### Question 15: Monitoring & Alerting

**[Answer]**

**Monitoring Stack:**

| Tool | Purpose | Port |
|------|---------|------|
| Grafana | Dashboards, visualization | :3100 |
| PostgreSQL logs | Slow query monitoring | Built-in |

**Health Checks:**
- `/api/health` endpoint on each app instance
- Docker healthcheck every 30 seconds
- 90-second start period for migrations

**Grafana Configuration:**
- Admin credentials via `GRAFANA_PASSWORD` secret
- Redis datasource plugin installed
- Dashboard provisioning from `./config/grafana/dashboards/`
- SMTP alerts configurable

**Alerting Capabilities:**
- Grafana email alerts (SMTP configuration available)
- `ai_budget_alerts` table for AI cost threshold alerts
- Alert severities: INFO, WARNING, CRITICAL

**Error Tracking:**
- Sentry DSN environment variable available (currently empty)
- `console.error` for error logging

---

## 7. External Integrations

### Question 16: Payment/Billing System Integration

**[Answer]**

**Provider:** Toss Payments (토스페이먼츠)

**Plan Pricing:**
| Plan | Monthly | Annual |
|------|---------|--------|
| PRO | ₩49,000 | ₩490,000 |
| TEAM | ₩99,000 | ₩990,000 |

**Payment Flow:**
```
┌───────────────────────────────────────────────────────────────────┐
│                    Toss Payments Flow                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. POST /api/payments/checkout                                   │
│     ├─ Validate plan (PRO/TEAM)                                   │
│     ├─ Calculate amount                                           │
│     └─ Return checkout URL                                        │
│                                                                    │
│  2. User completes payment on Toss widget                         │
│                                                                    │
│  3. Webhook: POST /api/webhooks/toss                              │
│     ├─ Verify payment                                             │
│     ├─ Create subscription record                                 │
│     └─ Store tossBillingKey                                       │
│                                                                    │
│  4. Success redirect: /api/payments/checkout/success              │
│                                                                    │
│  Refunds: POST /api/refund-requests                               │
│     ├─ Calculate prorated amount                                  │
│     ├─ 10% penalty (if contractual)                               │
│     └─ Admin approval workflow                                    │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

**Test Mode:** `TOSS_TEST_MODE=true` enables mock checkout without actual API calls

**Database Tables:**
- `subscriptions`: Plan, status, tossBillingKey, tossCustomerId
- `payments`: Amount, status, tossPaymentKey, taxInvoiceIssued
- `RefundRequest`: Refund calculation, status tracking

---

### Question 17: External API and Scraping Integrations

**[Answer]**

**NTIS API (National Science & Technology Information Service):**
| Aspect | Details |
|--------|---------|
| Authentication | API Key (`NTIS_API_KEY`) |
| Data Format | XML (fast-xml-parser) |
| Schedule | Daily scraping (configurable via `NTIS_SCRAPING_DAYS_BACK`) |
| Rate Limiting | 10 requests/minute |

**Web Scraping Targets:**
| Agency | URL | Parser |
|--------|-----|--------|
| IITP | iitp.kr | `iitp-parser.ts` |
| KEIT | keit.re.kr | `keit-parser.ts` |
| TIPA | tipa.or.kr | `tipa-parser.ts` |
| KIMST | kimst.re.kr | `kimst-parser.ts` |

**Scraping Architecture:**
- **Worker:** Dedicated Docker container (`connect-scraper`)
- **Scheduler:** node-cron based scheduling
- **Queue:** BullMQ jobs on redis-queue
- **Anti-detection:** Playwright with stealth plugin, custom user agent

**Document Processing:**
- PDF extraction (pdf-parse)
- HWP/Hancom conversion (custom converters)
- OCR for scanned documents (tesseract.js)

**Error Handling:**
- `scraping_logs` table tracks success/failure
- Retry mechanism with exponential backoff
- `processingStatus` enum: PENDING, PROCESSING, COMPLETED, FAILED, SKIPPED

---

### Question 18: Email/Notification Delivery System

**[Answer]**

**Provider:** AWS SES (Seoul Region) via Nodemailer

**Configuration (`lib/email/config.ts`):**
```typescript
{
  host: 'email-smtp.ap-northeast-2.amazonaws.com',
  port: 587,
  secure: false, // STARTTLS
  auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
}
```

**Email Templates (`lib/email/templates/`):**
| Template | Purpose |
|----------|---------|
| `new-match.ts` | New funding match notification |
| `deadline-reminder.ts` | 7/3/1 day deadline reminders |
| `weekly-digest.ts` | Weekly match summary |
| `beta-welcome.ts` | Beta user onboarding |
| `farewell.ts` | Account deletion confirmation |
| `base.ts` | Shared HTML template wrapper |

**Notification Types (NotificationType enum):**
- `NEW_MATCH`
- `DEADLINE_REMINDER_7DAYS`
- `DEADLINE_REMINDER_3DAYS`
- `DEADLINE_REMINDER_1DAY`
- `WEEKLY_DIGEST`

**Scheduling:**
- Cron jobs via `lib/email/cron.ts`
- Background processing via BullMQ

**User Preferences:**
- `emailNotifications`: Enable/disable all emails
- `weeklyDigest`: Enable/disable weekly digest
- Stored in `users` table

---

## 8. Testing / Quality Management

### Question 19: Testing Strategy and Coverage

**[Answer]**

**Testing Frameworks:**
| Type | Framework | Location |
|------|-----------|----------|
| Unit Tests | Jest 29.7.0 | `__tests__/**/*.test.ts` |
| E2E Tests | Playwright 1.56.1 | `__tests__/e2e/**/*.spec.ts` |

**Jest Configuration (`jest.config.ts`):**
- Environment: `node` (with `jsdom` option for React components)
- Coverage provider: V8
- Module alias: `@/` mapped to project root
- Coverage threshold: 5% (branches, functions, lines, statements)

**Playwright Configuration (`playwright.config.ts`):**
- Test directory: `./__tests__/e2e`
- Browsers: Chromium, Firefox, WebKit
- Mobile: Pixel 5, iPhone 12
- Authentication: Pre-saved session in `.playwright/paul-auth.json`
- Parallel execution: Enabled locally, sequential on CI

**Test Scripts (package.json):**
```bash
npm test              # Run Jest unit tests
npm run test:watch    # Jest watch mode
npm run test:e2e      # Playwright all tests
npm run test:e2e:prod # Playwright against production
```

**CI Integration:**
- Tests run on every push to main
- PostgreSQL 16 and Redis 7 service containers
- `--passWithNoTests` flag for graceful handling

---

### Question 20: Code Quality Management

**[Answer]**

**ESLint (`.eslintrc.json`):**
```json
{
  "extends": ["next/core-web-vitals"]
}
```
- Next.js recommended rules
- Core Web Vitals enforcement

**TypeScript (`tsconfig.json`):**
- Strict mode enabled
- Path aliases (`@/*`)
- ES2022 target

**Scripts:**
```bash
npm run lint       # ESLint check
npm run type-check # TypeScript validation
```

**CI Enforcement:**
- `npm run lint` runs in GitHub Actions test job
- Build fails on lint errors

**Code Style:**
- Implicit Prettier via editor settings
- Consistent imports via path aliases

---

## 9. Configuration Management / i18n / Time Zones

### Question 21: Environment Variables and Secret Management

**[Answer]**

**Environment File Structure:**

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.local` | Local development | Ignored |
| `.env.production` | Production (auto-generated) | Ignored |
| `.env.example` | Template with placeholder values | Tracked (deleted) |

**Secret Categories:**

1. **Database:**
   - `DATABASE_URL`, `DB_PASSWORD`

2. **Authentication:**
   - `NEXTAUTH_SECRET`, `JWT_SECRET`
   - `KAKAO_CLIENT_ID/SECRET`, `NAVER_CLIENT_ID/SECRET`

3. **Encryption:**
   - `ENCRYPTION_KEY` (64 hex chars = 32 bytes)

4. **External Services:**
   - `TOSS_CLIENT_KEY/SECRET_KEY`
   - `NTIS_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `SMTP_USER/PASSWORD`

**Security Measures:**
- `.gitignore` includes all `.env*` files except examples
- Production secrets stored in GitHub Secrets
- `.env.production` regenerated on every deployment
- Symlink `.env -> .env.production` for Docker Compose compatibility

---

### Question 22: Time Zone/Locale Handling (KST-centric)

**[Answer]**

**Server Configuration:**
- Container timezone: `TZ: UTC` (docker-compose)
- PostgreSQL: UTC storage with `ko_KR.UTF-8` locale

**Database Storage:**
- All `DateTime` fields stored in UTC
- `@db.Date` for date-only fields

**Frontend Display:**
- `date-fns` library for formatting
- Korean locale formatting (e.g., "2025년 1월 15일")
- KST conversion: UTC + 9 hours

**Key Date Fields:**
- `deadline`: Program application deadlines (UTC, displayed as KST)
- `createdAt/updatedAt`: System timestamps (UTC)
- `paidAt`, `deletedAt`: Transaction timestamps (UTC)

---

### Question 23: Internationalization and Korean UI Structure

**[Answer]**

**Current State:**
- Primary language: Korean (한국어)
- UI strings embedded in React components
- No dedicated i18n library currently active

**Available Infrastructure:**
- `next-intl` 3.17.2 installed (not fully implemented)
- React Server Components compatible

**Korean-Specific Features:**
- Korean OAuth providers (Kakao, Naver)
- Korean business number validation (XXX-XX-XXXXX)
- Korean currency formatting (₩)
- Korean error messages and UI copy

**Future Multi-language Extension:**
1. Create `/messages/{locale}.json` files
2. Configure `next-intl` middleware
3. Extract hardcoded strings to translation keys
4. Add language selector to UI

---

## 10. Data Retention / Account Deletion / Legal Compliance

### Question 24: Account Deletion and Data Handling Policy

**[Answer]**

**Deletion API:** `POST /api/users/delete-account`

**Two-Step Verification:**
1. Request deletion code via email
2. Submit 6-digit code (15-minute window)

**Deletion Flow:**
```
┌───────────────────────────────────────────────────────────────────┐
│                   Account Deletion Process                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Validate verification code (Redis, 15-min TTL)                │
│  2. Cancel Toss Payments subscription (if exists)                 │
│  3. Send farewell email with deletion confirmation                │
│  4. Create audit log (ACCOUNT_DELETION_INITIATED)                 │
│  5. CASCADE delete user + related data                            │
│  6. Create anonymized audit log (ACCOUNT_DELETION_COMPLETED)      │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

**Cascade Deleted Data:**
- `accounts` (OAuth connections)
- `sessions` (NextAuth)
- `subscriptions` + `payments`
- `match_notifications`
- `ai_cost_logs`, `ai_feedback`
- `consortium_members`, `consortium_projects` (created by user)
- `contact_requests` (sent by user)
- `feedback`

**Retained Data:**
- `organizations` (shared resource, relationship severed)
- `funding_programs` (public data)
- `funding_matches` (organization-owned, not user-owned)
- `audit_logs` (anonymized, 3-year retention per PIPA Article 31)

---

### Question 25: Personal Data and Log Retention Period (Korean Law Compliance)

**[Answer]**

**Applicable Laws:**
- **PIPA** (개인정보보호법): Personal Information Protection Act
- **전자상거래법** (Electronic Commerce Act)

**Retention Periods:**

| Data Type | Retention Period | Legal Basis |
|-----------|-----------------|-------------|
| Audit logs | 3 years | PIPA Article 31 |
| Payment records | 5 years | Electronic Commerce Act |
| Tax invoices | 5 years | Tax Law |
| Marketing consent records | Until withdrawal | PIPA Article 22 |
| Account deletion records | 3 years (anonymized) | PIPA Article 21 |

**PIPA Compliance Measures:**

1. **Article 21 (Right to Delete):**
   - User-initiated deletion via verified process
   - Farewell email documenting deleted data types
   - Immediate database deletion

2. **Article 31 (Audit Requirements):**
   - All personal data access logged in `audit_logs`
   - Decryption events logged with `logDecryptionAccess()`
   - Anonymized audit retention (3 years)

3. **Encryption Requirements:**
   - Business numbers: AES-256-GCM encrypted
   - Key rotation utility provided
   - Hash-based search to minimize decryption

**Data Disposal:**
- Hard deletion (not soft delete) for user data
- Anonymized identifiers in audit logs (`DELETED_{userId}`)
- No re-registration blocking (email not blacklisted)

---

## Appendix: Document Information

| Attribute | Value |
|-----------|-------|
| **Document Version** | 1.0 |
| **Analysis Date** | December 1, 2025 |
| **Codebase Version** | Commit 84b8eb8 (main branch) |
| **Analyzed By** | Claude Code (Opus 4.5) |
| **Total Questions** | 25 |
| **Status** | Complete |

---

*This document was generated based on direct codebase analysis and represents the technical state of the Connect platform as of the analysis date.*
