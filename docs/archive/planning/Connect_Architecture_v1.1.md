# CONNECT – Functional Decomposition & Technology Architecture (v1.1)
*Last updated: 2025-09-25 (KST)*
*Updated to include sole proprietorship considerations*

---

## A. Functional Decomposition (Detailed Unit Functions)
Below are the product surfaces and the granular unit functions required to implement them. For every function we specify **purpose**, **inputs/outputs**, **core logic**, **UI components**, **APIs/Contracts**, **data models**, **background jobs**, and **test coverage**.

### A1. Authentication & Identity
- **A1.1 Sign-up / Sign-in (Email, SSO)**
  - Purpose: Create/verify user identity, bind to org.
  - Inputs: email, password/SSO token; optional invite token.
  - Outputs: session/JWT; `user_id`, `org_id` bindings.
  - UI: Sign-in/up forms, SSO buttons.
  - API: `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
  - Models: `users(id, email, name, locale, role)`, `orgs(id, name, plan, seats, business_structure)`, `invites(token, org_id, role)`.
  - Jobs: email verification; password reset.
  - Tests: unit (validators), integration (SSO), e2e (new user flow).

- **A1.2 RBAC & Org Membership**
  - Purpose: Enforce org-scoped access and per-role privileges.
  - API: Policy middleware reading `role` (Owner, Admin, Member, Viewer).
  - Models: `memberships(user_id, org_id, role)`; audit log.

### A2. Organization & Profile Intake (Surveys)
- **A2.1 Org-Type Survey Wizard (Company[Corporate Entity/Sole Proprietorship]/Institute/University/Investor)**
  - Purpose: Collect structured signals (business_structure, personal_guarantee_capacity, TRL, co-fund, market proof, facilities, IP/TTO, ethics, COI, etc.).
  - UI: Multi-step wizard with autosave; KR/EN; business structure-specific conditional fields.
  - API: `PUT /survey/:section`, `GET /survey/state`.
  - Models: `profiles(org_id, persona, business_structure, sections jsonb)`.
  - Logic: client-side validation; server-side normalization; business structure-specific validation rules.

- **A2.2 Business Registration Verification**
  - Purpose: Validate Korean business registration numbers (10-digit for sole proprietorships, 13-digit for corporations).
  - Inputs: business_reg_num, business_structure; Outputs: verified status + basic company info.
  - API: `POST /verify/business-registration`.
  - External: Integration with Korean business registry API.
  - Logic: Format validation, checksum verification, real-time API lookup.

- **A2.3 Normalization Dictionary & Resolver**
  - Purpose: Canonicalize names, locations, titles, units, business structures.
  - Inputs: free-text fields; Outputs: normalized values + references.
  - API: `POST /normalize` (batch).
  - Models: `norm_dictionary(key, canonical, synonyms[])`.
  - Jobs: nightly updates; conflict detector.

- **A2.4 Data-Quality Guardrails**
  - Purpose: Hard blocks (evidence required, business registration verification), warnings (sanity checks, sole proprietorship-specific validations).
  - API: `POST /dq/validate`.
  - Logic: rule engine with ruleset per persona and business structure.

### A3. Matching Engine
- **A3.1 Eligibility Gates**
  - Purpose: Filter by must-have constraints (org type, business structure, TRL band, co-fund minima, ethics, permits).
  - API: internal module; `POST /match/gates` for debugging.
  - Models: `programs(id, track, gates jsonb, weights jsonb, deadlines, business_structure_eligibility)`.

- **A3.2 Scoring & Weighting**
  - Purpose: Compute fit score from weighted signals; cap/boost rules; business structure-specific adjustments.
  - Inputs: normalized profile vectors; program vectors.
  - Outputs: Top N matches; near-miss set.
  - API: `POST /match/score`.
  - Logic: Business structure-specific weight adjustments for decision speed, guarantee capacity.

- **A3.3 Explainability Generator**
  - Purpose: Human-readable reasons for match and improvement coaching.
  - Inputs: contribution breakdown; rule hits/misses; business structure context.
  - Outputs: explanation paragraphs (KR/EN), checklist links, business structure-specific guidance.
  - API: `POST /match/explain`.

- **A3.4 Near-Miss Coach**
  - Purpose: Suggest actions to convert near-miss → match (e.g., evidence to add, partner to secure, business structure considerations).
  - API: `POST /coach/near-miss`.
  - Logic: Business structure-specific coaching (e.g., corporate conversion guidance for sole proprietorships).

### A4. Discovery & Search
- **A4.1 Global Search (Programs, Partners, IP, Labs)**
  - Inputs: query, filters (track, deadline window, region, TRL, org type, business structure).
  - API: `GET /search?q=...` (OpenSearch/ES backend).
  - UI: search bar with facets; saved searches; business structure filter.

- **A4.2 Saved Searches & Alerts**
  - Jobs: cron to evaluate new/changed items → send digest/instant alerts.
  - Models: `saved_searches(user_id, query, cadence)`; `alerts(id, type, payload)`.

### A5. Workspaces & Execution
- **A5.1 Workspace & Projects**
  - Models: `workspaces(id, org_id, business_structure)`, `projects(id, workspace_id, program_id)`.
  - UI: Kanban or checklist view; business structure-specific task templates.

- **A5.2 Checklist Engine**
  - Purpose: Template → tasks(owners, due dates, status), attachments; business structure-specific checklists.
  - API: `POST /projects/:id/checklist`, `PATCH /tasks/:id`.
  - Jobs: deadline reminders.
  - Logic: Dynamic checklist generation based on business structure (simplified for sole proprietorships).

- **A5.3 Auto-Draft Generator**
  - Purpose: Create initial proposal/letters from templates + profile data; business structure-appropriate templates.
  - Outputs: docx/pdf; stored in object storage; export ready.

### A6. Intros & Consortiums
- **A6.1 Warm Intro Requests**
  - State machine: requested → contacted → accepted/declined; SLA timers.
  - API: `POST /intros`, `PATCH /intros/:id/state`.
  - Models: `intros(id, from_org, to_entity, state, sla, business_structure_context)`.

- **A6.2 Consortium Builder**
  - Purpose: assemble multi-party applications; invite roles; share docs; handle business structure complexity.
  - Logic: Business structure compatibility checks; role assignment based on entity type.

### A7. Pricing, Billing & Metering
- **A7.1 Plan & Seat Management**
  - API: `GET/POST /billing/plan`, `POST /billing/seats`.
  - Models: `subscriptions(org_id, plan, term, status, business_structure)`, `seats`.

- **A7.2 Metering Middleware**
  - Purpose: enforce Free vs Pro limits; trial triggers; business structure-specific limits.
  - Runtime counters in Redis; monthly keys per org/user.

- **A7.3 Payments & Invoicing**
  - Monthly card billing; annual invoice & bank transfer; tax docs; sole proprietorship-friendly payment options.
  - Logic: Business structure-appropriate invoicing and tax treatment.

### A8. Content & Localization
- **A8.1 KR/EN Copy Packs**; **A8.2 Template Registry** (explanations, checklists); **A8.3 Business Structure-Specific Content**.

### A9. Admin & Ops
- **A9.1 Admin Console**: programs catalogue CRUD; ruleset editor; feature flags; business structure analytics.
- **A9.2 Observability**: metrics, logs, traces; fairness dashboards including business structure equity.
- **A9.3 Data Ingestion Pipelines**: crawlers/APIs for funding sources; dedup; freshness; business structure eligibility parsing.

### A10. Business Structure Support Services
- **A10.1 Corporate Conversion Advisory**
  - Purpose: Guide sole proprietorships on when/how to convert to corporate entities.
  - API: `GET /advisory/corporate-conversion`.
  - Logic: Decision tree based on funding amount, complexity, growth stage.

- **A10.2 Simplified Documentation Generator**
  - Purpose: Generate streamlined application documents for sole proprietorships.
  - Logic: Template simplification; reduced bureaucracy; focus on essential requirements.

- **A10.3 Personal Guarantee Assessment**
  - Purpose: Evaluate personal guarantee capacity for sole proprietorships.
  - API: `POST /assess/personal-guarantee`.
  - Logic: Credit assessment; liability evaluation; recommendation engine.

---

## B. Technology Architecture

### B1. High-Level Architecture
- **Client (Web):** Next.js (React), TypeScript, Tailwind, shadcn/ui, i18n (next-intl), SWR/React Query.
- **BFF/API Gateway:** Node.js (NestJS/Fastify), GraphQL/REST hybrid; auth middleware; rate limits.
- **Services (microservices or modular monolith):**
  1) **Identity & RBAC**  
  2) **Survey & Profiles** (enhanced with business structure logic)
  3) **Business Registration Verification** (new service)
  4) **Normalization & DQ** (enhanced with business structure rules)
  5) **Matching & Explainability** (enhanced with business structure weights)
  6) **Search** (OpenSearch/Elasticsearch)  
  7) **Workspaces & Checklists** (business structure-aware templates)
  8) **Intros/SLA**  
  9) **Billing & Metering** (business structure-specific pricing)
  10) **Ingestion & Catalog** (enhanced with business structure eligibility)
  11) **Notifications** (email/SMS/push)  
  12) **Admin Console** (business structure analytics)
  13) **Business Structure Advisory** (new service)
- **Data Stores:** PostgreSQL (OLTP), Redis (counters/cache/queues), OpenSearch (search), S3-compatible object storage (MinIO/AWS S3) for docs/exports.
- **External APIs:** Korean Business Registry API, Credit Assessment APIs, Tax/Accounting APIs.
- **Async Backbone:** Kafka/Redpanda or RabbitMQ (events: profile_changed, business_structure_verified, program_updated, match_recompute_requested, intro_state_changed, alert_dispatch).
- **Observability:** OpenTelemetry → Prometheus + Grafana; Loki for logs; Sentry for errors.
- **Security:** OAuth2/OIDC (Auth0/Keycloak), JWT (org-scoped), RBAC, per-field PII encryption (KMS), WAF, CSP, RASP.
- **Infra:** Docker, Kubernetes, Helm; NGINX/Envoy ingress; CDN (CloudFront/Fastly), TLS, IaC (Terraform). KR region primary.

### B2. Module-to-DB Mapping
- Identity & RBAC → `users`, `orgs`, `memberships`, `invites`, `audit_log`
- Survey & Profiles → `profiles`, `attachments`, `evidence`, `business_verification`
- Programs Catalog → `programs`, `tracks`, `eligibility_rules`, `weight_sets`, `deadlines`, `business_structure_eligibility`
- Matching → `match_cache`, `explanations`, `near_miss`, `business_structure_adjustments`
- Workspaces → `workspaces`, `projects`, `tasks`, `comments`, `checklist_templates`
- Intros → `intros`, `intro_sla_events`
- Billing → `subscriptions`, `invoices`, `payments`, `usage_counters`, `business_structure_pricing`
- Metering → Redis keys per org/user/month
- Search → OpenSearch indexes: `programs_idx`, `partners_idx`, `business_structure_facets`

### B3. API Contracts (Selected)
- `POST /survey/:section` `{ section_id, fields[], business_structure } → 200 { saved: true, warnings[] }`
- `POST /verify/business-registration` `{ reg_num, structure } → 200 { verified: true, company_info }`
- `POST /match/run` `{ track, limit, business_structure_filters } → 200 { top[], near_miss[] }`
- `POST /explain` `{ candidate_id, business_structure } → { reasons[], checklist_id, structure_specific_guidance }`
- `POST /intros` `{ to_entity_id, business_structure_context } → { intro_id, state: "requested" }`
- `POST /meter/check` `{ capability, business_structure } → { allow|block, reason?, upsell? }`
- `GET /advisory/corporate-conversion` `{ current_structure, funding_target } → { recommendation, timeline, steps[] }`

### B4. Data Flow (Typical - Enhanced)
1. User completes survey → **Business Registration Verification** validates structure → **Normalization & DQ** enrich and validate → profile snapshot stored with business structure context.
2. User selects **Funding** track → **Matching** applies gates (including business structure eligibility) then weights → Top3 + Near-miss with structure-specific coaching.
3. User opens 2nd detail on Free → **Metering** checks business structure-specific limits → blocks with upgrade modal; trial may start.
4. User upgrades to Pro → **Billing** updates plan with business structure pricing → **Metering** switches limits live.
5. User creates checklist → **Checklist Engine** generates business structure-appropriate tasks → **Notifications** schedule reminders.
6. User requests Warm Intro → **Intros** state machine kicks off with business structure context → SLA timers and alerts.
7. Sole proprietorship reaches funding threshold → **Advisory Service** suggests corporate conversion → guidance provided.

### B5. Deployment Topology
- **prod-kr** cluster (primary), **staging** cluster, **dev** namespaces per feature team.
- Multi-AZ PostgreSQL (managed), Redis (HA), OpenSearch (managed), Object storage (S3/MinIO).
- Blue/green or canary deployments; feature flags.

### B6. Performance, Reliability, Security
- Performance: P95 page <1.5s; matching compute <800ms; search P95 <300ms; business registration verification <500ms.
- Reliability: ≥99.9% uptime; backups (RPO≤24h/RTO≤4h); circuit breakers; idempotent jobs.
- Security: OWASP ASVS L2; PII encryption; key rotation; audit trails; GDPR/PIPA compliance; DDoS protection; rate limits; enhanced KYC for sole proprietorships.

### B7. Internationalization & Accessibility
- KR/EN parity; locale-aware dates/currency; WCAG 2.1 AA; keyboard navigation; business structure terminology localization.

### B8. CI/CD & Quality Gates
- CI: lint/typecheck/tests; SCA (Dependabot); SAST (CodeQL); container scanning.
- CD: ArgoCD/GitOps; migrations gated with pre-flight checks; smoke tests; rollback.
- QA: contract tests for APIs; synthetic monitors; load tests before major deadlines season; business structure-specific test scenarios.

### B9. Analytics & Fairness Monitoring
- Event schema as per metering spec; funnels: Free→Pro, trial start→convert, near-miss→upgrade.
- Fairness KPIs: SME vs Large high-fit gap, Metro vs Non-metro coverage, **Corporate vs Sole Proprietorship opportunity gap**; alert when drift > thresholds.
- Business structure analytics: conversion rates, success rates, funding outcomes by structure type.

---

## C. Implementation Roadmap (90 Days)
- **Phase 1 (Weeks 1-4):** Auth/RBAC, Survey MVP with business structure fields, Business Registration Verification, Normalization/DQ v1, Programs catalog with business structure eligibility, Matching gates, Pricing page.
- **Phase 2 (Weeks 5-8):** Scoring/Explainability with business structure weights, Workspaces + Checklists with structure-specific templates, Metering middleware, Billing & seats with structure pricing, Search MVP with business structure filters.
- **Phase 3 (Weeks 9-12):** Warm Intros + SLA with business structure context, Alerts, Auto-draft with structure-appropriate templates, Admin console with business structure analytics, Ingestion pipelines, Observability & fairness dashboards, Business Structure Advisory Service.

---

## D. Risks & Mitigations
- **Data freshness:** Prioritize Pro queues; show freshness badges per item.
- **Source fragmentation:** Unify via ingestion contracts + dedup keys.
- **Gaming the trial:** One trial/org/12mo; payment method/device fingerprinting.
- **Bias in matching:** Regular weight audits; counterfactual testing; appeal workflow in UI; **business structure equity monitoring**.
- **Business registration verification downtime:** Fallback to manual verification; cached verification status.
- **Sole proprietorship complexity:** Simplified onboarding flow; clear documentation; dedicated support channel.
- **Corporate conversion guidance accuracy:** Partner with legal/accounting firms; regular content updates; disclaimer on advisory nature.

---

*End of document.*