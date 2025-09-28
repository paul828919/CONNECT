# Connect Platform - Project Documentation

Korean R&D ecosystem matching platform connecting Companies, Research Institutes, and Universities through Funding → Collaboration → Tech Transfer.

## Quick Start

- **Latest PRD**: [`docs/current/PRD_v7.0.md`](docs/current/PRD_v7.0.md)
- **Deployment Guide**: [`docs/current/Deployment_Architecture_v2.md`](docs/current/Deployment_Architecture_v2.md)
- **Scraping Config**: [`docs/current/NTIS_Agency_Scraping_Config.md`](docs/current/NTIS_Agency_Scraping_Config.md)
- **Claude Context**: [`CLAUDE.md`](CLAUDE.md)

## Directory Structure

```
connect/
├── CLAUDE.md                 # Claude Code guidance (always in root)
├── README.md                 # This file
├── docs/
│   ├── current/              # Latest active documents (v7.0+)
│   │   ├── PRD_v7.0.md      # Complete product requirements
│   │   ├── Deployment_Architecture_v2.md  # Production deployment guide
│   │   └── NTIS_Agency_Scraping_Config.md # 19-agency scraping specs
│   ├── archive/              # Previous versions for reference
│   │   ├── prd/             # Historical PRD versions
│   │   ├── deployment/      # Old deployment guides
│   │   └── planning/        # Initial planning documents
│   └── reference/           # Supporting documentation
│       ├── NTIS_RD_project_ordering_agencies_v1.md
│       ├── Connect_Users_Survey_v3.1_KR.md
│       ├── Connect_pricing_metering_v1.md
│       ├── Technology_Stack_v2.0_i9-12900K_Server.md
│       └── Accelerated_Development_Timeline_with_Claude_Code_v1.md
└── .claude/                 # Claude Code system files
```

## Key Documents

### Current (Active)
- **PRD v7.0**: Comprehensive product requirements with 19 NTIS agencies
- **Deployment Architecture v2**: Production-ready single-server deployment
- **NTIS Scraping Config**: Technical implementation for all 19 agencies

### Archive
- **PRD Evolution**: v4.1 → v5.0 → v6.0 → v7.0 (current)
- **Planning Documents**: Initial architecture and feature breakdown
- **Legacy Deployment**: Previous deployment strategies

### Reference
- **NTIS Agencies**: Complete list of 19 commissioning agencies
- **User Research**: Survey results and user personas
- **Technology Stack**: Hardware optimization for i9-12900K server
- **Timeline**: Development schedule with Claude Code

## Project Status

- **Current Version**: PRD v7.0 (Production Ready)
- **Target Launch**: December 15, 2024
- **Peak Season**: January-March 2025 (99.9% uptime required)
- **Development**: MacBook M4 Max → Linux i9-12900K deployment

## Architecture Highlights

- **Single-Server Optimization**: Native services, no Docker in production
- **Complete Coverage**: All 19 NTIS commissioning agencies
- **Real-Time Data**: Multi-daily scraping with tiered frequency
- **Performance**: 10,000+ concurrent users, sub-second response times

## Key Technical Decisions

1. **Native over Containerized**: Maximum performance on 128GB RAM server
2. **Comprehensive Agency Coverage**: 19 agencies vs. competitors' 3-5
3. **Tiered Scraping**: 3x daily for critical, 2x daily for major agencies
4. **Cross-Platform Development**: ARM development, x86 production

## Quick Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run lint            # ESLint checking
npm run type-check      # TypeScript verification

# Database
npm run db:migrate      # Run migrations
npm run db:studio       # Open Prisma Studio

# Deployment
./scripts/deploy.sh     # Deploy to production
./scripts/health-check.sh  # System health check
```

## Documentation Conventions

- **Current docs**: Latest production-ready versions
- **Archive**: Historical versions for reference and evolution tracking
- **Reference**: Supporting materials and research
- **Filenames**: Simplified without "Connect_" prefix in organized folders

For development guidance, see [`CLAUDE.md`](CLAUDE.md) which provides context for Claude Code sessions.

---

**Last Updated**: September 29, 2024
**Project**: Connect Platform v7.0
**Status**: Ready for Development