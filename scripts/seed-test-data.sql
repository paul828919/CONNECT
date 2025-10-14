-- ============================================================================
-- Connect Platform - Test Data Seed Script
-- ============================================================================
-- Purpose: Populate database with test organizations and funding programs
-- Usage: psql -U connect -d connect -f seed-test-data.sql
--
-- Creates:
-- - 2 test organizations (1 company, 1 research institute)
-- - 8 funding programs from 4 agencies with proper deadlines
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Test Organizations
-- ============================================================================

-- Test Company Ltd. (ICT sector, TRL 6)
INSERT INTO organizations (
  id,
  type,
  name,
  "businessNumberEncrypted",
  "businessNumberHash",
  "businessStructure",
  description,
  "industrySector",
  "employeeCount",
  "revenueRange",
  "rdExperience",
  "technologyReadinessLevel",
  "profileCompleted",
  "profileScore",
  status,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'COMPANY'::"OrganizationType",
  'Test Company Ltd.',
  'encrypted_123-45-67890',  -- Placeholder (real encryption requires Node.js)
  encode(digest('123-45-67890', 'sha256'), 'hex'),  -- SHA-256 hash
  'CORPORATION'::"BusinessStructure",
  'Test company for development and testing purposes. Specializes in ICT solutions.',
  'ICT',
  'FROM_10_TO_50'::"EmployeeCountRange",
  'FROM_1B_TO_10B'::"RevenueRange",
  true,  -- rdExperience
  6,     -- technologyReadinessLevel
  true,  -- profileCompleted
  85,    -- profileScore
  'ACTIVE'::"OrganizationStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("businessNumberHash") DO NOTHING;

-- Test Research Institute (AI/Biotech focus)
INSERT INTO organizations (
  id,
  type,
  name,
  "businessNumberEncrypted",
  "businessNumberHash",
  "instituteType",
  "researchFocusAreas",
  "annualRdBudget",
  "researcherCount",
  "keyTechnologies",
  "collaborationHistory",
  description,
  "profileCompleted",
  "profileScore",
  status,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'RESEARCH_INSTITUTE'::"OrganizationType",
  'Test Research Institute',
  'encrypted_987-65-43210',  -- Placeholder
  encode(digest('987-65-43210', 'sha256'), 'hex'),  -- SHA-256 hash
  'GOVERNMENT_FUNDED'::"InstituteType",
  ARRAY['AI', 'Biotechnology', 'Clean Energy']::TEXT[],
  'FROM_10B_TO_50B',
  150,  -- researcherCount
  ARRAY['Machine Learning', 'Data Analytics', 'IoT', 'Blockchain', 'Quantum']::TEXT[],
  true,  -- collaborationHistory
  'Test research institute for development and testing purposes.',
  true,  -- profileCompleted
  90,    -- profileScore
  'ACTIVE'::"OrganizationStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("businessNumberHash") DO NOTHING;

-- ============================================================================
-- PART 2: Funding Programs (8 programs from 4 agencies)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- IITP Programs (정보통신기획평가원) - 2 programs
-- ----------------------------------------------------------------------------

INSERT INTO funding_programs (
  id,
  "agencyId",
  title,
  description,
  "announcementUrl",
  "targetType",
  "minTrl",
  "maxTrl",
  "budgetAmount",
  "fundingPeriod",
  deadline,
  category,
  keywords,
  "contentHash",
  status,
  "publishedAt",
  "scrapedAt",
  "lastCheckedAt",
  "scrapingSource",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'IITP'::"AgencyId",
  '2025년 ICT R&D 혁신 바우처 지원사업',
  'AI·빅데이터·클라우드 등 ICT 기술 개발을 위한 중소기업 대상 R&D 바우처 지원',
  'https://www.iitp.kr/kr/1/business/notice/view.it?ArticleIdx=5431',
  ARRAY['COMPANY']::"OrganizationType"[],
  3,  -- minTrl
  7,  -- maxTrl
  50000000000,  -- 500억원
  '12 months',
  CURRENT_TIMESTAMP + INTERVAL '45 days',  -- Deadline: 45 days from now
  'ICT',
  ARRAY['AI', 'BigData', 'Cloud', 'ICT']::TEXT[],
  encode(digest('IITP-ICT-RD-VOUCHER-2025', 'sha256'), 'hex'),
  'ACTIVE'::"ProgramStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'seed_script',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("contentHash") DO NOTHING;

INSERT INTO funding_programs (
  id,
  "agencyId",
  title,
  description,
  "announcementUrl",
  "targetType",
  "minTrl",
  "maxTrl",
  "budgetAmount",
  "fundingPeriod",
  deadline,
  category,
  keywords,
  "contentHash",
  status,
  "publishedAt",
  "scrapedAt",
  "lastCheckedAt",
  "scrapingSource",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'IITP'::"AgencyId",
  '디지털 전환 촉진 지원사업 (DX Transformation)',
  '중소기업의 디지털 전환을 위한 SW·데이터 분석 플랫폼 구축 지원',
  'https://www.iitp.kr/kr/1/business/notice/view.it?ArticleIdx=5432',
  ARRAY['COMPANY', 'RESEARCH_INSTITUTE']::"OrganizationType"[],
  4,  -- minTrl
  8,  -- maxTrl
  30000000000,  -- 300억원
  '24 months',
  CURRENT_TIMESTAMP + INTERVAL '60 days',  -- Deadline: 60 days from now
  'Digital Transformation',
  ARRAY['DX', 'Software', 'Platform', 'Data']::TEXT[],
  encode(digest('IITP-DX-TRANSFORMATION-2025', 'sha256'), 'hex'),
  'ACTIVE'::"ProgramStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'seed_script',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("contentHash") DO NOTHING;

-- ----------------------------------------------------------------------------
-- KEIT Programs (한국산업기술평가관리원) - 2 programs
-- ----------------------------------------------------------------------------

INSERT INTO funding_programs (
  id,
  "agencyId",
  title,
  description,
  "announcementUrl",
  "targetType",
  "minTrl",
  "maxTrl",
  "budgetAmount",
  "fundingPeriod",
  deadline,
  category,
  keywords,
  "contentHash",
  status,
  "publishedAt",
  "scrapedAt",
  "lastCheckedAt",
  "scrapingSource",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'KEIT'::"AgencyId",
  '산업기술 혁신사업 (신제품 개발)',
  '제조 산업 경쟁력 강화를 위한 신제품·신기술 개발 지원',
  'https://www.keit.re.kr/business/notice/view.do?idx=12345',
  ARRAY['COMPANY']::"OrganizationType"[],
  5,  -- minTrl
  9,  -- maxTrl
  80000000000,  -- 800억원
  '36 months',
  CURRENT_TIMESTAMP + INTERVAL '35 days',  -- Deadline: 35 days from now
  'Manufacturing',
  ARRAY['Manufacturing', 'NewProduct', 'Innovation']::TEXT[],
  encode(digest('KEIT-INDUSTRIAL-INNOVATION-2025', 'sha256'), 'hex'),
  'ACTIVE'::"ProgramStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'seed_script',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("contentHash") DO NOTHING;

INSERT INTO funding_programs (
  id,
  "agencyId",
  title,
  description,
  "announcementUrl",
  "targetType",
  "minTrl",
  "maxTrl",
  "budgetAmount",
  "fundingPeriod",
  deadline,
  category,
  keywords,
  "contentHash",
  status,
  "publishedAt",
  "scrapedAt",
  "lastCheckedAt",
  "scrapingSource",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'KEIT'::"AgencyId",
  '탄소중립 산업 전환 기술개발',
  '탄소중립 목표 달성을 위한 산업공정 혁신 기술 개발 지원',
  'https://www.keit.re.kr/business/notice/view.do?idx=12346',
  ARRAY['COMPANY', 'RESEARCH_INSTITUTE']::"OrganizationType"[],
  3,  -- minTrl
  7,  -- maxTrl
  60000000000,  -- 600억원
  '48 months',
  CURRENT_TIMESTAMP + INTERVAL '50 days',  -- Deadline: 50 days from now
  'Carbon Neutral',
  ARRAY['CarbonNeutral', 'GreenTech', 'ESG']::TEXT[],
  encode(digest('KEIT-CARBON-NEUTRAL-2025', 'sha256'), 'hex'),
  'ACTIVE'::"ProgramStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'seed_script',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("contentHash") DO NOTHING;

-- ----------------------------------------------------------------------------
-- TIPA Programs (중소기업기술정보진흥원) - 2 programs
-- ----------------------------------------------------------------------------

INSERT INTO funding_programs (
  id,
  "agencyId",
  title,
  description,
  "announcementUrl",
  "targetType",
  "minTrl",
  "maxTrl",
  "budgetAmount",
  "fundingPeriod",
  deadline,
  category,
  keywords,
  "contentHash",
  status,
  "publishedAt",
  "scrapedAt",
  "lastCheckedAt",
  "scrapingSource",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'TIPA'::"AgencyId",
  '중소기업 기술혁신개발사업 (S2-3)',
  '기술력 우수 중소기업 대상 제품 상용화 R&D 지원',
  'https://www.tipa.or.kr/business/notice/view.do?idx=98765',
  ARRAY['COMPANY']::"OrganizationType"[],
  6,  -- minTrl
  9,  -- maxTrl
  40000000000,  -- 400억원
  '24 months',
  CURRENT_TIMESTAMP + INTERVAL '30 days',  -- Deadline: 30 days from now
  'SME Support',
  ARRAY['SME', 'Commercialization', 'Product']::TEXT[],
  encode(digest('TIPA-SME-INNOVATION-S2-3-2025', 'sha256'), 'hex'),
  'ACTIVE'::"ProgramStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'seed_script',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("contentHash") DO NOTHING;

INSERT INTO funding_programs (
  id,
  "agencyId",
  title,
  description,
  "announcementUrl",
  "targetType",
  "minTrl",
  "maxTrl",
  "budgetAmount",
  "fundingPeriod",
  deadline,
  category,
  keywords,
  "contentHash",
  status,
  "publishedAt",
  "scrapedAt",
  "lastCheckedAt",
  "scrapingSource",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'TIPA'::"AgencyId",
  '스타트업 기술창업 지원사업',
  '초기 스타트업의 기술사업화 및 시장진입 지원',
  'https://www.tipa.or.kr/business/notice/view.do?idx=98766',
  ARRAY['COMPANY']::"OrganizationType"[],
  4,  -- minTrl
  7,  -- maxTrl
  20000000000,  -- 200억원
  '12 months',
  CURRENT_TIMESTAMP + INTERVAL '20 days',  -- Deadline: 20 days from now
  'Startup',
  ARRAY['Startup', 'Tech', 'Commercialization']::TEXT[],
  encode(digest('TIPA-STARTUP-TECH-2025', 'sha256'), 'hex'),
  'ACTIVE'::"ProgramStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'seed_script',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("contentHash") DO NOTHING;

-- ----------------------------------------------------------------------------
-- KIMST Programs (해양수산과학기술진흥원) - 2 programs
-- ----------------------------------------------------------------------------

INSERT INTO funding_programs (
  id,
  "agencyId",
  title,
  description,
  "announcementUrl",
  "targetType",
  "minTrl",
  "maxTrl",
  "budgetAmount",
  "fundingPeriod",
  deadline,
  category,
  keywords,
  "contentHash",
  status,
  "publishedAt",
  "scrapedAt",
  "lastCheckedAt",
  "scrapingSource",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'KIMST'::"AgencyId",
  '해양바이오 산업화 기술개발',
  '해양 바이오소재를 활용한 신산업 창출 지원',
  'https://www.kimst.re.kr/business/notice/view.do?idx=11111',
  ARRAY['COMPANY', 'RESEARCH_INSTITUTE']::"OrganizationType"[],
  3,  -- minTrl
  8,  -- maxTrl
  25000000000,  -- 250억원
  '36 months',
  CURRENT_TIMESTAMP + INTERVAL '70 days',  -- Deadline: 70 days from now
  'Marine Bio',
  ARRAY['MarineBio', 'Biotech', 'NewIndustry']::TEXT[],
  encode(digest('KIMST-MARINE-BIO-2025', 'sha256'), 'hex'),
  'ACTIVE'::"ProgramStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'seed_script',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("contentHash") DO NOTHING;

INSERT INTO funding_programs (
  id,
  "agencyId",
  title,
  description,
  "announcementUrl",
  "targetType",
  "minTrl",
  "maxTrl",
  "budgetAmount",
  "fundingPeriod",
  deadline,
  category,
  keywords,
  "contentHash",
  status,
  "publishedAt",
  "scrapedAt",
  "lastCheckedAt",
  "scrapingSource",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'KIMST'::"AgencyId",
  '스마트 수산양식 기술개발',
  'ICT 기반 스마트 양식 시스템 구축 및 실증',
  'https://www.kimst.re.kr/business/notice/view.do?idx=11112',
  ARRAY['COMPANY']::"OrganizationType"[],
  5,  -- minTrl
  9,  -- maxTrl
  15000000000,  -- 150억원
  '24 months',
  CURRENT_TIMESTAMP + INTERVAL '80 days',  -- Deadline: 80 days from now
  'Smart Aquaculture',
  ARRAY['SmartFarm', 'ICT', 'Aquaculture']::TEXT[],
  encode(digest('KIMST-SMART-AQUACULTURE-2025', 'sha256'), 'hex'),
  'ACTIVE'::"ProgramStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'seed_script',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("contentHash") DO NOTHING;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these after executing the script to verify data was inserted correctly

-- Check organizations count
SELECT
  type,
  COUNT(*) as count,
  SUM(CASE WHEN "profileCompleted" = true THEN 1 ELSE 0 END) as completed_profiles
FROM organizations
GROUP BY type;

-- Check funding programs count
SELECT
  "agencyId",
  COUNT(*) as count,
  SUM(CASE WHEN deadline IS NOT NULL AND deadline > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as matchable
FROM funding_programs
GROUP BY "agencyId"
ORDER BY "agencyId";

-- Show organization details
SELECT
  id,
  type,
  name,
  "industrySector",
  "technologyReadinessLevel" as trl,
  "profileCompleted",
  "profileScore"
FROM organizations
WHERE name LIKE 'Test%'
ORDER BY type;

-- Show funding programs with deadlines
SELECT
  "agencyId",
  title,
  deadline,
  EXTRACT(DAY FROM (deadline - CURRENT_TIMESTAMP)) as days_until_deadline,
  "targetType",
  "minTrl",
  "maxTrl"
FROM funding_programs
WHERE deadline IS NOT NULL
ORDER BY deadline ASC;
