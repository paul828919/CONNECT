# CONNECT – Product Requirements Document (PRD)
**Version:** v4.1  
**Scope:** Funding, Collaboration, Technology Transfer, and Investor Matching as first-class tracks.  
**Note:** Personas split for Institutes and Universities. **Updated to include sole proprietorships.**

---

## 1) Product Overview
CONNECT is an explainable matching platform for Korea's innovation ecosystem. It collects structured signals via org-type surveys (Company [Corporate Entity/Sole Proprietorship], Institute, University, Investor), normalizes data, evaluates explicit gates and weighted signals, and outputs **Top 3 matches** plus **Near-miss** items with upgrade guidance and execution tools (workspace, warm-intro, consortium builder).

---

## 2) Goals & Non-goals

### Goals
- Increase high-fit matches with clear explanations and reduce dead-ends via Near-miss coaching.  
- Shorten the path from match → meeting → application/term sheet with workspaces and intro SLAs.  
- Ensure fairness across SME vs Large, Corporate Entity vs Sole Proprietorship, and Metro vs Non-metro via balancing weights and dashboards.

### Non-goals
- Automated submission to external grant portals (future).  
- Long-form proposal editing (we provide concise checklists and evidence prompts instead).

---

## 3) Core Value Propositions
- **Explainable matching:** explicit gates + weighted scoring; Top/Near-miss with "how to upgrade."  
- **Actionable execution:** application workspace, warm intro flow, and consortium builder.  
- **Grant→Equity handoff:** investors alerted when validation milestones are reached.

---

## 4) User Personas & Jobs-to-be-done (updated)

### 4.1 Companies (Startup/SME/Mid/Large + Corporate Entity/Sole Proprietorship)
**JTBD:** Find fundable programs, credible partners/testbeds, or ready-to-license IP that solves our problems—fast.

Signals collected include:
- **Business structure:** Corporate entity (법인) vs Sole proprietorship (개인사업자)
- Org size, R&D budget band, co-fund ratio (cash/in-kind split), TRL.  
- Market proof (LOI/PO/revenue), facilities/testbeds, regulation path (e.g., MFDS).  
- Partner preferences and three problem statements with tags/evidence links.
- **Sole proprietorship specific:** Individual business registration number, personal guarantee capacity, simplified accounting requirements.

### 4.2 Government-affiliated / Government-funded Research Institutes
**JTBD:** Secure multi-year R&D budgets aligned to national priorities, find industry partners for pilots, and transfer validated tech to market.

Signals collected include:
- Institute type & mission domain; national-priority alignment tags; cross-ministry experience.  
- Testbeds & regulated facilities (certs, safety/permits), data assets; sharing policy.  
- Standard collaboration models (MOU/indirect cost rules), IP policy (exclusive/non-exclusive).  
- Staff availability windows; security/classification constraints.

### 4.3 Universities (PI/Lab/TTO)
**JTBD:** Win grants to fund research, form industry collaborations, and commercialize IP via licensing or spin-offs.

Signals collected include:
- PI rank/tenure, grant history band (e.g., NRF), lab size & student pools; research track (basic/applied).  
- TRL 1–3 assets; publication/patent links; TTO involvement and revenue-share policy.  
- Startup intent/COI, ethics (IRB/IACUC), industry collaboration history; desired commercialization path.

### 4.4 Investors (Gov-affiliated, Domestic VC/PE/Accel/CVC, Overseas)
**JTBD:** See high-signal inbound aligned with ticket/round/sector and move quickly to 1st meeting/term sheet.

Signals collected include:
- Type; AUM band; remaining investment period; ticket min/max; target ownership; lead/follow.  
- Preferred sectors & exclusions; geography; IC cadence; decision speed; governance asks.  
- DD must-haves; data-room links; co-invest policy; ESG frame; intro policy.
- **Business structure preferences:** Willingness to invest in sole proprietorships vs requirement for corporate structure.

---

## 5) Key User Flows (happy paths)
- **Sign-up & Profile → org-type survey (including business structure) → normalization & DQ → choose card(s) → matching → Top 3 + Near-miss ≤ 5 → actions.**  
- **Grant→Equity handoff:** when validated/pilot-ready, notify suitable investors; reduce perceived risk.  
- **Tech transfer:** company problem statements ↔ IP / TRL & IP status; suggest license structures.
- **Sole proprietorship onboarding:** Simplified KYC flow with business registration verification and funding eligibility check.

---

## 6) Data Model (Signals & Normalization)
Signals registry includes `business_structure`, `individual_biz_reg_num`, `personal_guarantee_capacity`, `TRL`, `cofund_ratio_total`, `market_proof`, `partner_pref`, `facility_assets`, `grant_history_band`, `tto_involvement`, `ip_status`, `absorptive_capacity`, etc.  
Normalization dictionaries cover cities, org names, titles, rounds, units, geo, IC cadence, and **business structure standardization**.

---

## 7) Matching Logic (deterministic + weighted + near-miss)

### 7.1 Funding
- **Gates:** program-specific eligibility (org type, **business structure**, TRL bands, co-fund minima, evidence presence).  
- **Weights (example):** TRL 0.28, co-fund 0.22, market proof 0.18, partner mix 0.17, facilities 0.10, region/ESG 0.05.  
- **Near-miss:** ±1 TRL or adjacent co-fund band with explicit upgrade checklist.
- **Sole proprietorship adjustments:** Reduced documentation requirements for MSS programs, emphasis on personal guarantee capacity.

### 7.2 Collaboration
- **Gates:** presence of company + university + institute as needed; schedule alignment; facility/testbed availability.  
- **Weights:** complementarity 0.30; co-fund 0.20; testbed 0.20; timeline 0.20; regional balance 0.10.  
- **Persona tuning:** Institutes → weight on testbed readiness & permits; Universities → on student capacity & TTO SLA; **Sole proprietorships → operational flexibility and decision speed**.

### 7.3 Technology Transfer
- **Gates:** IP status (filed/granted) **OR** problem statements present.  
- **Weights (Universities):** problem–solution 0.40, IP readiness 0.22, TRL 0.20, absorptive capacity 0.18.  
- **Weights (Institutes):** testbed-supported validation 0.30, policy-fit/public-interest 0.22, TRL 0.22, partner commercialization capacity 0.26.  
- **Near-miss:** non-exclusive license alternatives if exclusivity conflicts; propose partners to bridge gaps.
- **Sole proprietorship considerations:** Simplified IP transfer mechanisms, personal liability assessments.

### 7.4 Investor (Equity) Matching
- **Gates:** round ∈ investor.rounds; ticket within band; sector overlap minus exclusions; geo match; candidate meets investor DD must-haves; **business structure compatibility**.  
- **Weights:** problem–solution 0.25; market proof 0.20; team/absorptive 0.20; round–ticket alignment 0.20; timing (IC cadence × runway) 0.15.  
- **Near-miss:** relax ticket/round ±1; propose bridge/SAFE, co-invest, and milestone plan.
- **Sole proprietorship matching:** Flag investors open to individual businesses; suggest corporate conversion timeline if needed.

---

## 8) Explanations, Checklists, and Intro SLAs
- KR/EN explanation templates per track with variable placeholders (e.g., `{trl}`, `{cofund_ratio_total}`, `{business_structure}`, `{gaps}`).  
- Output checklists per track with lead-times (e.g., 21–28 days) and required documents, **including sole proprietorship-specific requirements**.  
- Intro state machine: requested → contacted → accepted/declined with response SLAs and expiries.

---

## 9) Data Quality (DQ) & Guardrails
- **Hard blocks:** TRL ≥ 7 requires evidence; COI for spin-off/JV; institute safety permits for regulated testbeds; **sole proprietorship business registration verification**.  
- **Warnings:** headcount vs R&D budget sanity; missing co-fund split; sector–exclusion conflicts; **personal guarantee vs funding amount feasibility**.  
- **Investor guards:** intro rate limits; staged reveal (blind teaser → interest → restricted data room).

---

## 10) UX Outputs
- **Results page:** Top 3 + Near-miss ≤ 5 per card; each shows score, reasons, gaps, checklist link, and CTA (Warm Intro / Start Application).  
- **Workspace:** deadline back-plan and checklist items with due dates based on program lead-time.
- **Business structure indicator:** Clear badges showing corporate/sole proprietorship status and relevant funding tracks.

---

## 11) KPIs & Fairness Guardrails
- **Funding:** Coverage ≥ 75%, High-fit ≥ 30%, Near-miss→Top upgrades ≥ 35%/month.  
- **Collaboration:** Coverage ≥ 70%, partner acceptance ≥ 45%, pilot start ≥ 25%.  
- **Tech Transfer:** Coverage ≥ 60%, proposal exchange ≥ 30%, license/option ≥ 10%.  
- **Bias:** SME vs Large High-fit gap ≤ 12%p; Metro vs Non-metro coverage gap ≤ 10%p; **Corporate vs Sole Proprietorship opportunity gap ≤ 8%p**.  
- **Investor launch:** active investor ratio ≥ 60%; response ≥ 55%; first-meeting ≥ 35%; TS/LOI (High-fit) 8–12%; overseas investor match 10–15% @ 6 months.

---

## 12) Acceptance Criteria (MVP)
- Surveys render with validations and normalization; autosave on change; **business structure selection integrated**.  
- Matching engine applies gates and weights; returns Top 3 + Near-miss ≤ 5 with explanations and checklists.  
- Intro SLA and state transitions enforced; expiry handling and reason capture.
- **Sole proprietorship verification via business registration API integration**.

---

## 13) Non-functional Requirements
- **Performance:** P95 page < 1.5s; match compute < 800ms.  
- **Reliability:** uptime ≥ 99.9%; backups RPO ≤ 24h / RTO ≤ 4h.  
- **Security/Privacy:** per-field consent, redaction, RBAC, audit; PIPA/Network Act compliance; KR data residency primary; **enhanced KYC for sole proprietorships**.  
- **Accessibility & i18n:** WCAG 2.1 AA; KR/EN parity; timezone & currency formatting.

---

## 14) Rollout Plan
- **MVP cohort:** 50 companies (SME-heavy, **including 15 sole proprietorships**), 10 institutes, 10 universities, 15 investors (domestic P1 + few overseas P2).  
- **Observe & tune:** monitor High-fit rates, Near-miss upgrades, intro response/meeting/TS conversion, **sole proprietorship success rates**.  
- **Fairness checks:** adjust balancing weights if SME/region/**business structure** gaps exceed thresholds.

---

*Source: Updated from Connect PRD v4 to include sole proprietorship considerations.*