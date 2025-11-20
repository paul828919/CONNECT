# CLAUDE.md_V2_251017
This file provides guidelines for using Claude Code (claude.ai/code) when working on code in this repository.
---
## ⚠️ Important Work Rules - Read First
### 1. Local verification is mandatory
**Do not commit or push without local verification.**
- **Rule**: When executing a task, always verify it locally after completion. Commit and push only after local verification is complete. After completing all updates to script files, databases, and architecture, be sure to commit and push, then ask me whether to proceed with deployment. Always run npx prisma db push after modifying schema.prisma or use npx prisma migrate dev for production-like environments (creates migration history). 
- **Avoid the mistake of “assuming rather than verifying”**: Especially for infrastructure-related matters like authentication or caching, always explore the actual architecture of the existing codebase before creating imports.
- **Preventing schema field name mismatches**: When modifying or updating Prisma schemas, avoid assuming field naming conventions. Always verify field names against the actual Prisma schema (schema.prisma) and examine patterns in similar existing routes.
- **Deploy to the production environment**: When a single task—such as a detailed task or a single item on your to-do list—is completed, commit and push it.
- **Time**: Production deployment takes approximately 12 minutes. Local verification takes 2-5 minutes. Always verify first.
**Never use browser automation tools (Playwright) when inspecting GitHub Actions pages.**
- **Rule**: I(user) will personally visit the pagehttps://github.com/paul828919/CONNECT/actions를 to check and share the latest run results. 
- **Docker Requirement**: If Docker is not running locally during development or modification, **notify the user to start Docker**. Never skip local verification solely because Docker is not running.
- **No Exceptions**: Even “simple” changes like configuration files, YAML syntax, or document updates are no exception.
**Importance:**
- Prevents production failures taking over 12 minutes to discover
- Detects issues locally within 2-5 minutes that would take hours to debug in production
- Industry Standard: Local → CI → Staging → Production (Never skip the local stage)
### 2. Security: SSH Keys Only
**Never use passwords in commands.**
```bash
# ✅ Correct method - Always use SSH key authentication
ssh -i ~/.ssh/id_ed25519_connect user@59.21.170.6
# ❌ Incorrect Method - Never use password authentication
sshpass -p ‘password’ ssh user@59.21.170.6
```
### 3. 🏗️ CI/CD Architecture (Production-Grade Entrypoint Pattern)
**Status:** ✅ Production-ready (100% successful deployments since October 15, 2025)
**Architecture Pattern:** Industry-standard entrypoint
**Changes (October 15, 2025):**
- ❌ **Previous Approach (5 Failures)**: External migration orchestration - 200 lines, 7 failure points
- ✅ **New Approach (100% Success)**: Entrypoint pattern (Heroku/AWS/K8s model) - 50 lines, self-healing
**How It Works:**
```
Push to GitHub → GitHub Actions trigger Docker build → SSH connection to server →
Zero-downtime rolling update → Execute migration at container startup (entrypoint) →
Health check verification → Success (or automatic rollback)
```
**⚠️ Important - Must verify before Docker build:**
**Development Environment:** MacBook Pro M4 Max (ARM64/aarch64 architecture)
**Production Environment:** Linux server 221.164.102.253 (x86_64/amd64 architecture)
**Essential Build Command (used in all sessions):**
```bash
docker buildx build --platform linux/amd64 -f Dockerfile.production -t connect:latest .
```
**Criticality:**
1. **Architecture Mismatch** - ARM-built containers from Mac crash on x86 Linux production due to missing system libraries
2. **Silent Errors** - Docker shows no errors during build, but containers fail at runtime with cryptic errors like:
- `exec /usr/local/bin/node: exec format error` (Incorrect CPU architecture)
- `npm ERR! missing: @prisma/client` (Native binding compiled for ARM instead of x86)

- `libssl.so.3: cannot open shared object file` (incorrect system library version)
3. **Production Impact** - Recent case: October 17, 2025 - 502 downtime due to npm EACCES error
**Alternative: Set Default Platform (Optional but Recommended)**
Add the following to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export DOCKER_DEFAULT_PLATFORM=linux/amd64
```
Restart your terminal. All subsequent `docker build` commands will use x86_64 as the default.
**Post-build verification:**
```bash
# Verify image architecture (Must display “linux/amd64”)
docker inspect connect:latest --format=‘{ {.Architecture}}’
```

**Core Files:**
1. `docker-entrypoint.sh` - Runs internal migration upon container startup (20 lines)
2. `Dockerfile.production` - Multi-stage build including entrypoint
3. `.github/workflows/deploy-production.yml` - Automated deployment (50 lines)
4. `docker-compose.production.yml` - Orchestration including 90-second health checks
**Key Concepts:**
- **Migrations run inside containers** (not externally via `docker run`)
- **Self-contained**: Each container handles its own initialization
- **Self-healing**: Migration failure = container failure = automatic rollback
- **Atomic verification**: Health checks simultaneously validate migration + application + endpoint

**Docker Image Contents (Critical - October 25, 2025 Fix):**
- **All application code must be in Docker images** - Never rely on manual file synchronization (rsync) for production
- **scripts/ directory is containerized** - Added explicit COPY statements in both Dockerfiles (commit 3314be9)
- **CI/CD verification enforced** - GitHub Actions verifies scripts/ exists before deployment
- **Historical Context**: Prior to Oct 25, scripts/ was excluded, creating a deployment gap where:
  - GitHub Actions deployed containers without scripts/
  - Manual rsync kept host files in sync
  - Result: Two-mechanism deployment with hidden manual dependency
- **Fix Applied**: Dockerfile.scraper line 27, Dockerfile.production line 94, GitHub Actions lines 155-177
---
## Project Overview
Connect is **Korea's R&D Commercialization Operating System**, transforming companies' research funding acquisition journey from discovery to contract award. This platform combines automated matching with specialized execution services, positioning companies as primary paying customers (research institutions serve as supply-side partners for consortium matching).
**Strategic Positioning:**
- **Beyond simple research funding discovery** - Full commercialization support (discovery → application → award)
- **Hybrid business model** - Software (₩490,000–990,000/month) + Services (₩2–7 million/project)
- **Enterprise-centric** - 90% of revenue comes from enterprises; research institutes are free supply-side partners
- **Exclusive data competitiveness** - Performance tracking (win rate, cycle time) creates competitive advantage
- **Generates revenue from month 1** - Immediate cash flow secured through service provision


### Deployment Documentation
**📚 Full Deployment Architecture Documentation:**
**Getting Started:**
- [START-HERE-DEPLOYMENT-DOCS.md](./START-HERE-DEPLOYMENT-DOCS.md) - Main Navigation
- [DEPLOYMENT-ARCHITECTURE-INDEX.md](./DEPLOYMENT-ARCHITECTURE-INDEX.md) - Full Index
- [DEPLOYMENT-ARCHITECTURE-LESSONS.md](./DEPLOYMENT-ARCHITECTURE-LESSONS.md) - In-Depth Analysis (788 lines)
- [DEPLOYMENT-ARCHITECTURE-QUICK-REFERENCE.md](./DEPLOYMENT-ARCHITECTURE-QUICK-REFERENCE.md) - Quick Patterns
**Changes (October 15, 2025):**
- ✅ Replaced external migration orchestration with entrypoint pattern
- ✅ Reduced deployment complexity by 75% (200 → 50 lines)
- ✅ Achieved 100% deployment success rate (previously 5 failures)
- ✅ Industry-standard architecture (Heroku/AWS/Kubernetes model)
- `docs/current/PRD_v8.0.md`: **Start here** - Complete product requirements including strategic shift (enterprise focus, hybrid model, services, performance tracking)
- `CONNECT_FINAL_PROPOSAL_v1.0.md` (Desktop): Summary of multi-AI discussion synthesis
- `CONNECT_IMPLEMENTATION_SPECS_v1.0.md` (Desktop): Parts 1-4 (Database schema, MSA, UI copy, email templates)
- `CONNECT_IMPLEMENTATION_SPECS_v1.0_PART2.md` (Desktop): Parts 5-8 (API specifications, code snippets, configuration, deployment)

### Implementation Documentation
Record foundational decisions through **step-by-step retrospectives**. **Read this first** when starting new work.
- **[Phase 1A: Infrastructure Foundation](docs/implementation/phase1a-infrastructure.md)** (8-12 hours)

- Tech Stack (Next.js 14, PostgreSQL 15, Prisma ORM, Redis, Docker Compose)
- OAuth (Kakao, Naver using NextAuth.js)
- Security (AES-256-GCM encryption, SHA-256 hashing, rate limiting)

- Database schema (8 models, 14 enumerations, 25+ indexes, PIPA compliant)
- **Key Decisions**: PostgreSQL vs MongoDB, Prisma vs TypeORM, Docker Compose vs K8s
- **[Phase 2A: Match Generation System](docs/implementation/phase2a-match-generation.md)** (3-4 hours)

- Core matching algorithm (Industrial Relevance 30 points, TRL 20 points, Type 20 points, R&D 15 points, Deadline 15 points)
- Korean description generator
- Match generation API with subscription-based rate limiting
- Match verification UI with cards, score visualization, and CTA
- Database seeding (16 programs from 4 institutions)

**Summary**: Connect is not a grant search tool. Connect is Korea's R&D commercialization operating system, combining software automation with professional services to help companies discover, apply for, and secure government funding. Its hybrid business model (software + services) ensures profitability from the first month while building a defensible competitive advantage through proprietary performance data.




