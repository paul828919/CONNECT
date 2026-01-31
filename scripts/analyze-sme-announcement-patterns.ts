/**
 * SME Announcement Pattern Analysis Script
 * Phase 1.2: Ideal Profile Construction & Proximity Matching
 *
 * Reads 50+ diverse sme_programs from the database, analyzes each for
 * "ideal applicant" signals beyond what SME v2.0 matching captures.
 *
 * SME programs differ from R&D in structure:
 * - Structured API codes (bizTypeCd, targetCompanyScaleCd) vs free text
 * - detailPageText / detailPageDocumentText provide enrichment beyond API
 * - 53% of eligibility fields are NULL → need fallback analysis
 *
 * Outputs:
 * 1. Data availability audit (which fields are populated, how useful)
 * 2. Signal discovery from free-text fields (description, supportTarget, detailPageText)
 * 3. BizType-specific pattern analysis
 * 4. Gap analysis: what current algorithm misses
 *
 * Usage: npx tsx scripts/analyze-sme-announcement-patterns.ts
 */

import { PrismaClient, SMEProgramStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// Signal Extraction Patterns (Korean) — SME-specific
// ═══════════════════════════════════════════════════════════════

/** Industry/domain signals from free text */
const INDUSTRY_PATTERNS: Record<string, RegExp[]> = {
  MANUFACTURING: [/제조/g, /생산/g, /공장/g, /스마트공장/g, /자동화/g, /소재/g, /부품/g],
  ICT: [/ICT/g, /IT/g, /소프트웨어/g, /SW/g, /인공지능/g, /AI/g, /데이터/g, /클라우드/g, /디지털/g],
  BIO_HEALTH: [/바이오/g, /헬스/g, /의료/g, /제약/g, /의료기기/g, /건강/g],
  FOOD_AGRICULTURE: [/식품/g, /농업/g, /농산물/g, /축산/g, /수산/g, /6차산업/g],
  ENERGY_ENVIRONMENT: [/에너지/g, /환경/g, /탄소/g, /재생에너지/g, /친환경/g, /ESG/g],
  CULTURE_CONTENTS: [/콘텐츠/g, /문화/g, /관광/g, /게임/g, /K-/g, /한류/g],
  LOGISTICS: [/물류/g, /유통/g, /공급망/g, /SCM/g],
  CONSTRUCTION: [/건설/g, /건축/g, /인테리어/g, /리모델링/g],
};

/** Company stage/growth signals */
const COMPANY_STAGE_PATTERNS: Record<string, RegExp[]> = {
  PRE_STARTUP: [/예비창업/g, /예비.*창업/g, /창업.*준비/g],
  EARLY_STARTUP: [/초기창업/g, /창업초기/g, /3년.*미만/g, /초기.*기업/g],
  GROWTH_STAGE: [/성장/g, /성장기/g, /도약/g, /스케일업/g],
  MATURE: [/재도약/g, /성숙/g, /안정/g, /경쟁력.*강화/g],
  RESTART: [/재창업/g, /재기/g, /회생/g, /폐업.*후/g],
};

/** Support type/purpose signals */
const SUPPORT_PURPOSE_PATTERNS: Record<string, RegExp[]> = {
  RND_FUNDING: [/연구개발/g, /R&D/g, /기술개발/g, /기술혁신/g],
  POLICY_FUND: [/정책자금/g, /융자/g, /대출/g, /저리/g, /금리/g],
  MARKET_EXPANSION: [/판로/g, /마케팅/g, /수출/g, /해외시장/g, /바이어/g, /전시회/g],
  HUMAN_RESOURCE: [/인력/g, /채용/g, /교육/g, /훈련/g, /멘토링/g, /컨설팅/g],
  CERTIFICATION: [/인증/g, /시험/g, /검사/g, /품질/g, /특허/g, /지재권/g],
  SPACE_INFRA: [/입주/g, /창업공간/g, /센터/g, /보육/g, /공유오피스/g],
  INVESTMENT: [/투자/g, /펀드/g, /엔젤/g, /IR/g, /데모데이/g],
};

/** Implicit requirements beyond structured codes */
const IMPLICIT_REQUIREMENT_PATTERNS: Record<string, RegExp[]> = {
  TECHNOLOGY_BASED: [/기술.*기반/g, /기술형/g, /기술집약/g, /기술.*보유/g, /기술력/g],
  INNOVATION_CERT: [/이노비즈/g, /벤처기업/g, /벤처.*인증/g, /메인비즈/g],
  EXPORT_EXPERIENCE: [/수출.*실적/g, /수출.*경험/g, /해외.*매출/g],
  IP_REQUIRED: [/특허/g, /지식재산/g, /지재권/g, /산업재산권/g],
  SOCIAL_ENTERPRISE: [/사회적.*기업/g, /사회적경제/g, /소셜벤처/g, /협동조합/g],
  FEMALE_OWNER: [/여성.*대표/g, /여성기업/g, /여성.*창업/g],
  YOUTH: [/청년/g, /청년.*창업/g, /39세.*이하/g],
  LOCAL_ROOTS: [/지역.*기업/g, /지역.*소재/g, /소재지/g, /지방.*기업/g],
};

/** Expected outcomes from the support */
const OUTCOME_PATTERNS: Record<string, RegExp[]> = {
  REVENUE_GROWTH: [/매출.*증가/g, /매출.*성장/g, /매출.*향상/g, /매출.*확대/g],
  JOB_CREATION: [/일자리/g, /고용/g, /채용/g, /신규.*인력/g],
  EXPORT_GROWTH: [/수출.*증가/g, /수출.*확대/g, /해외.*진출/g],
  TECH_COMMERCIALIZATION: [/사업화/g, /상용화/g, /제품화/g, /시제품/g],
  CERTIFICATION_ACQUISITION: [/인증.*취득/g, /인증.*획득/g, /품질.*향상/g],
  SURVIVAL: [/경영.*안정/g, /자금.*지원/g, /운영자금/g, /긴급/g],
};

// ═══════════════════════════════════════════════════════════════
// Analysis Types
// ═══════════════════════════════════════════════════════════════

interface SignalMatch {
  category: string;
  count: number;
  matchedText: string[];
}

interface SMEFieldAudit {
  field: string;
  populatedCount: number;
  totalCount: number;
  fillRate: number;
  sampleValues: string[];
}

interface SMEProgramAnalysis {
  programId: string;
  title: string;
  bizType: string | null;
  bizTypeCd: string | null;
  sportType: string | null;
  lifeCycle: string[];

  // Structured field availability
  hasTargetCompanyScale: boolean;
  hasTargetSalesRange: boolean;
  hasTargetEmployeeRange: boolean;
  hasTargetBusinessAge: boolean;
  hasTargetRegions: boolean;
  hasRequiredCerts: boolean;

  // Text field availability
  hasDescription: boolean;
  descriptionLength: number;
  hasSupportTarget: boolean;
  supportTargetLength: number;
  hasSupportContents: boolean;
  supportContentsLength: number;
  hasDetailPageText: boolean;
  detailPageTextLength: number;
  hasDetailPageDocumentText: boolean;
  detailPageDocumentTextLength: number;

  // Discovered signals
  industrySignals: SignalMatch[];
  companyStageSignals: SignalMatch[];
  supportPurposeSignals: SignalMatch[];
  implicitRequirements: SignalMatch[];
  outcomeSignals: SignalMatch[];

  // Summary
  totalSignalsFound: number;
  textSignalSource: string; // Which text field provided most signals
}

function extractSignals(
  text: string,
  patterns: Record<string, RegExp[]>
): SignalMatch[] {
  const signals: SignalMatch[] = [];

  for (const [category, regexes] of Object.entries(patterns)) {
    const matchedTexts: string[] = [];
    let totalCount = 0;

    for (const regex of regexes) {
      const re = new RegExp(regex.source, regex.flags);
      const matches = text.match(re);
      if (matches) {
        totalCount += matches.length;
        matchedTexts.push(...Array.from(new Set(matches)));
      }
    }

    if (totalCount > 0) {
      signals.push({
        category,
        count: totalCount,
        matchedText: Array.from(new Set(matchedTexts)).slice(0, 5),
      });
    }
  }

  return signals;
}

function analyzeProgram(program: {
  id: string;
  title: string;
  bizType: string | null;
  bizTypeCd: string | null;
  sportType: string | null;
  lifeCycle: string[];
  description: string | null;
  supportTarget: string | null;
  supportContents: string | null;
  detailPageText: string | null;
  detailPageDocumentText: string | null;
  targetCompanyScale: string[];
  targetCompanyScaleCd: string[];
  targetSalesRange: string[];
  targetSalesRangeCd: string[];
  targetEmployeeRange: string[];
  targetEmployeeRangeCd: string[];
  targetBusinessAge: string[];
  targetBusinessAgeCd: string[];
  targetRegions: string[];
  targetRegionCodes: string[];
  requiredCerts: string[];
  requiredCertsCd: string[];
}): SMEProgramAnalysis {
  // Build text corpus from all available text fields
  const textSources: { name: string; text: string }[] = [];

  if (program.description) textSources.push({ name: 'description', text: program.description });
  if (program.supportTarget) textSources.push({ name: 'supportTarget', text: program.supportTarget });
  if (program.supportContents) textSources.push({ name: 'supportContents', text: program.supportContents });
  if (program.detailPageText) textSources.push({ name: 'detailPageText', text: program.detailPageText });
  if (program.detailPageDocumentText) textSources.push({ name: 'detailPageDocumentText', text: program.detailPageDocumentText });

  const fullText = [program.title, ...textSources.map(s => s.text)].join('\n');

  // Extract signals
  const industrySignals = extractSignals(fullText, INDUSTRY_PATTERNS);
  const companyStageSignals = extractSignals(fullText, COMPANY_STAGE_PATTERNS);
  const supportPurposeSignals = extractSignals(fullText, SUPPORT_PURPOSE_PATTERNS);
  const implicitRequirements = extractSignals(fullText, IMPLICIT_REQUIREMENT_PATTERNS);
  const outcomeSignals = extractSignals(fullText, OUTCOME_PATTERNS);

  const totalSignals =
    industrySignals.length +
    companyStageSignals.length +
    supportPurposeSignals.length +
    implicitRequirements.length +
    outcomeSignals.length;

  // Determine which text source provides most signals
  let bestSource = 'title-only';
  let bestSignalCount = 0;
  for (const source of textSources) {
    const sourceSignals =
      extractSignals(source.text, INDUSTRY_PATTERNS).length +
      extractSignals(source.text, COMPANY_STAGE_PATTERNS).length +
      extractSignals(source.text, SUPPORT_PURPOSE_PATTERNS).length +
      extractSignals(source.text, IMPLICIT_REQUIREMENT_PATTERNS).length +
      extractSignals(source.text, OUTCOME_PATTERNS).length;
    if (sourceSignals > bestSignalCount) {
      bestSignalCount = sourceSignals;
      bestSource = source.name;
    }
  }

  return {
    programId: program.id,
    title: program.title,
    bizType: program.bizType,
    bizTypeCd: program.bizTypeCd,
    sportType: program.sportType,
    lifeCycle: program.lifeCycle,

    hasTargetCompanyScale: program.targetCompanyScaleCd.length > 0,
    hasTargetSalesRange: program.targetSalesRangeCd.length > 0,
    hasTargetEmployeeRange: program.targetEmployeeRangeCd.length > 0,
    hasTargetBusinessAge: program.targetBusinessAgeCd.length > 0,
    hasTargetRegions: program.targetRegionCodes.length > 0,
    hasRequiredCerts: program.requiredCertsCd.length > 0,

    hasDescription: !!program.description,
    descriptionLength: program.description?.length || 0,
    hasSupportTarget: !!program.supportTarget,
    supportTargetLength: program.supportTarget?.length || 0,
    hasSupportContents: !!program.supportContents,
    supportContentsLength: program.supportContents?.length || 0,
    hasDetailPageText: !!program.detailPageText,
    detailPageTextLength: program.detailPageText?.length || 0,
    hasDetailPageDocumentText: !!program.detailPageDocumentText,
    detailPageDocumentTextLength: program.detailPageDocumentText?.length || 0,

    industrySignals,
    companyStageSignals,
    supportPurposeSignals,
    implicitRequirements,
    outcomeSignals,

    totalSignalsFound: totalSignals,
    textSignalSource: bestSource,
  };
}

// ═══════════════════════════════════════════════════════════════
// Main Analysis
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🔍 SME Announcement Pattern Analysis');
  console.log('═'.repeat(80));
  console.log('Goal: Discover ideal applicant signals in SME programs beyond structured codes\n');

  try {
    // Get bizType distribution for diverse sampling
    const bizTypeDistribution = await prisma.sme_programs.groupBy({
      by: ['bizTypeCd'],
      where: { status: SMEProgramStatus.ACTIVE },
      _count: true,
      orderBy: { _count: { bizTypeCd: 'desc' } },
    });

    console.log('📊 BizType Distribution (active programs):');
    for (const bt of bizTypeDistribution) {
      console.log(`   ${bt.bizTypeCd || 'NULL'}: ${bt._count} programs`);
    }

    // Sample diversely across bizTypes
    const programs: Awaited<ReturnType<typeof prisma.sme_programs.findMany>> = [];
    const seenIds = new Set<string>();

    for (const bt of bizTypeDistribution) {
      const perType = Math.max(3, Math.ceil(50 / bizTypeDistribution.length));
      const batch = await prisma.sme_programs.findMany({
        where: {
          status: SMEProgramStatus.ACTIVE,
          bizTypeCd: bt.bizTypeCd,
        },
        take: perType,
        orderBy: { updatedAt: 'desc' },
      });
      for (const p of batch) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          programs.push(p);
        }
      }
    }

    // Also sample some with detailPageText to analyze enrichment value
    const withDetailPage = await prisma.sme_programs.findMany({
      where: {
        status: SMEProgramStatus.ACTIVE,
        detailPageText: { not: null },
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });
    for (const p of withDetailPage) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        programs.push(p);
      }
    }

    console.log(`\n📋 Analyzing ${programs.length} programs across ${bizTypeDistribution.length} bizTypes\n`);
    console.log('═'.repeat(80));

    // Analyze each program
    const analyses: SMEProgramAnalysis[] = [];
    for (const program of programs) {
      const analysis = analyzeProgram(program);
      analyses.push(analysis);
    }

    // ═══════════════════════════════════════════════════════════════
    // Data Availability Audit
    // ═══════════════════════════════════════════════════════════════

    console.log('\n📝 DATA AVAILABILITY AUDIT');
    console.log('═'.repeat(80));

    const total = analyses.length;
    const fieldAudit: SMEFieldAudit[] = [
      {
        field: 'bizType (사업유형)',
        populatedCount: analyses.filter(a => a.bizType !== null).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: Array.from(new Set(analyses.map(a => a.bizType).filter((v): v is string => v !== null))).slice(0, 5),
      },
      {
        field: 'targetCompanyScale (기업규모)',
        populatedCount: analyses.filter(a => a.hasTargetCompanyScale).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'targetSalesRange (매출액)',
        populatedCount: analyses.filter(a => a.hasTargetSalesRange).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'targetEmployeeRange (종업원수)',
        populatedCount: analyses.filter(a => a.hasTargetEmployeeRange).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'targetBusinessAge (업력)',
        populatedCount: analyses.filter(a => a.hasTargetBusinessAge).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'targetRegions (지역)',
        populatedCount: analyses.filter(a => a.hasTargetRegions).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'requiredCerts (필요인증)',
        populatedCount: analyses.filter(a => a.hasRequiredCerts).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'description (사업개요)',
        populatedCount: analyses.filter(a => a.hasDescription).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'supportTarget (지원대상)',
        populatedCount: analyses.filter(a => a.hasSupportTarget).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'supportContents (지원내용)',
        populatedCount: analyses.filter(a => a.hasSupportContents).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'detailPageText (상세페이지)',
        populatedCount: analyses.filter(a => a.hasDetailPageText).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
      {
        field: 'detailPageDocumentText (공고문)',
        populatedCount: analyses.filter(a => a.hasDetailPageDocumentText).length,
        totalCount: total,
        fillRate: 0,
        sampleValues: [],
      },
    ];

    for (const fa of fieldAudit) {
      fa.fillRate = fa.populatedCount / fa.totalCount;
    }

    console.log('\n  Field                         Populated  Fill Rate');
    console.log('  ' + '─'.repeat(60));
    for (const fa of fieldAudit) {
      const bar = '█'.repeat(Math.ceil(fa.fillRate * 30));
      console.log(`  ${fa.field.padEnd(32)} ${String(fa.populatedCount).padStart(3)}/${total}  ${(fa.fillRate * 100).toFixed(0).padStart(3)}% ${bar}`);
    }

    // Text length statistics
    console.log('\n  Text Field Length Statistics:');
    const descLengths = analyses.filter(a => a.hasDescription).map(a => a.descriptionLength);
    const stLengths = analyses.filter(a => a.hasSupportTarget).map(a => a.supportTargetLength);
    const dpLengths = analyses.filter(a => a.hasDetailPageText).map(a => a.detailPageTextLength);
    const ddLengths = analyses.filter(a => a.hasDetailPageDocumentText).map(a => a.detailPageDocumentTextLength);

    if (descLengths.length > 0) {
      console.log(`  description:       avg=${(descLengths.reduce((a, b) => a + b, 0) / descLengths.length).toFixed(0)} chars, max=${Math.max(...descLengths)}`);
    }
    if (stLengths.length > 0) {
      console.log(`  supportTarget:     avg=${(stLengths.reduce((a, b) => a + b, 0) / stLengths.length).toFixed(0)} chars, max=${Math.max(...stLengths)}`);
    }
    if (dpLengths.length > 0) {
      console.log(`  detailPageText:    avg=${(dpLengths.reduce((a, b) => a + b, 0) / dpLengths.length).toFixed(0)} chars, max=${Math.max(...dpLengths)}`);
    }
    if (ddLengths.length > 0) {
      console.log(`  detailPageDocText: avg=${(ddLengths.reduce((a, b) => a + b, 0) / ddLengths.length).toFixed(0)} chars, max=${Math.max(...ddLengths)}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // Signal Prevalence
    // ═══════════════════════════════════════════════════════════════

    console.log('\n\n📈 SIGNAL PREVALENCE');
    console.log('═'.repeat(80));

    const signalCounts = {
      industry: analyses.filter(a => a.industrySignals.length > 0).length,
      companyStage: analyses.filter(a => a.companyStageSignals.length > 0).length,
      supportPurpose: analyses.filter(a => a.supportPurposeSignals.length > 0).length,
      implicitReqs: analyses.filter(a => a.implicitRequirements.length > 0).length,
      outcomes: analyses.filter(a => a.outcomeSignals.length > 0).length,
    };

    console.log(`\n  Signal Category         Programs  Prevalence`);
    console.log('  ' + '─'.repeat(55));
    console.log(`  Industry Signals:       ${String(signalCounts.industry).padStart(3)}/${total}  (${((signalCounts.industry/total)*100).toFixed(0)}%)`);
    console.log(`  Company Stage Signals:  ${String(signalCounts.companyStage).padStart(3)}/${total}  (${((signalCounts.companyStage/total)*100).toFixed(0)}%)`);
    console.log(`  Support Purpose:        ${String(signalCounts.supportPurpose).padStart(3)}/${total}  (${((signalCounts.supportPurpose/total)*100).toFixed(0)}%)`);
    console.log(`  Implicit Requirements:  ${String(signalCounts.implicitReqs).padStart(3)}/${total}  (${((signalCounts.implicitReqs/total)*100).toFixed(0)}%)`);
    console.log(`  Outcome Signals:        ${String(signalCounts.outcomes).padStart(3)}/${total}  (${((signalCounts.outcomes/total)*100).toFixed(0)}%)`);

    // Detailed sub-category prevalence
    console.log('\n\n📊 DETAILED SIGNAL BREAKDOWN');
    console.log('═'.repeat(80));

    const subCategoryCounts: Record<string, number> = {};
    for (const a of analyses) {
      const allSignals = [
        ...a.industrySignals,
        ...a.companyStageSignals,
        ...a.supportPurposeSignals,
        ...a.implicitRequirements,
        ...a.outcomeSignals,
      ];
      for (const s of allSignals) {
        subCategoryCounts[s.category] = (subCategoryCounts[s.category] || 0) + 1;
      }
    }

    const sortedSubCategories = Object.entries(subCategoryCounts)
      .sort((a, b) => b[1] - a[1]);

    for (const [cat, count] of sortedSubCategories) {
      const bar = '█'.repeat(Math.ceil((count / total) * 30));
      console.log(`  ${cat.padEnd(28)} ${String(count).padStart(3)} (${((count/total)*100).toFixed(0).padStart(3)}%) ${bar}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // BizType-Specific Analysis
    // ═══════════════════════════════════════════════════════════════

    console.log('\n\n📂 BIZTYPE-SPECIFIC PATTERN ANALYSIS');
    console.log('═'.repeat(80));

    const byBizType = new Map<string, SMEProgramAnalysis[]>();
    for (const a of analyses) {
      const key = a.bizType || 'NULL';
      if (!byBizType.has(key)) byBizType.set(key, []);
      byBizType.get(key)!.push(a);
    }

    for (const [bizType, btAnalyses] of Array.from(byBizType.entries()).sort((a, b) => b[1].length - a[1].length)) {
      const n = btAnalyses.length;
      const avgSignals = btAnalyses.reduce((s, a) => s + a.totalSignalsFound, 0) / n;

      // Top signals for this bizType
      const btSignals: Record<string, number> = {};
      for (const a of btAnalyses) {
        const allSignals = [...a.industrySignals, ...a.companyStageSignals, ...a.supportPurposeSignals, ...a.implicitRequirements, ...a.outcomeSignals];
        for (const s of allSignals) {
          btSignals[s.category] = (btSignals[s.category] || 0) + 1;
        }
      }

      const topSignals = Object.entries(btSignals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => `${cat}(${count}/${n})`)
        .join(', ');

      // Structured field coverage for this bizType
      const structuredCoverage = btAnalyses.filter(a =>
        a.hasTargetCompanyScale || a.hasTargetSalesRange || a.hasTargetEmployeeRange || a.hasTargetBusinessAge
      ).length;

      console.log(`\n  ${bizType} (${n} programs, avg ${avgSignals.toFixed(1)} signals, ${structuredCoverage}/${n} with structured eligibility)`);
      console.log(`    Top signals: ${topSignals || 'none'}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // Text Signal Source Analysis
    // ═══════════════════════════════════════════════════════════════

    console.log('\n\n📖 TEXT SIGNAL SOURCE ANALYSIS');
    console.log('═'.repeat(80));
    console.log('Which text fields provide the most ideal-applicant signals?\n');

    const sourceCounts: Record<string, number> = {};
    for (const a of analyses) {
      sourceCounts[a.textSignalSource] = (sourceCounts[a.textSignalSource] || 0) + 1;
    }

    for (const [source, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${source.padEnd(30)} ${count} programs (${((count/total)*100).toFixed(0)}%)`);
    }

    // ═══════════════════════════════════════════════════════════════
    // Top 20 Signal-Rich Programs
    // ═══════════════════════════════════════════════════════════════

    console.log('\n\n🔬 TOP 20 MOST SIGNAL-RICH PROGRAMS');
    console.log('═'.repeat(80));

    const topPrograms = [...analyses]
      .sort((a, b) => b.totalSignalsFound - a.totalSignalsFound)
      .slice(0, 20);

    for (const [idx, a] of topPrograms.entries()) {
      console.log(`\n${idx + 1}. ${a.title}`);
      console.log(`   BizType: ${a.bizType || 'N/A'} | SportType: ${a.sportType || 'N/A'} | Signals: ${a.totalSignalsFound} | Source: ${a.textSignalSource}`);

      if (a.industrySignals.length > 0) {
        console.log(`   🏭 Industry: ${a.industrySignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.companyStageSignals.length > 0) {
        console.log(`   📈 Stage: ${a.companyStageSignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.supportPurposeSignals.length > 0) {
        console.log(`   🎯 Purpose: ${a.supportPurposeSignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.implicitRequirements.length > 0) {
        console.log(`   🔑 Requirements: ${a.implicitRequirements.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.outcomeSignals.length > 0) {
        console.log(`   🎯 Outcomes: ${a.outcomeSignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Gap Analysis: What Current Algorithm Misses
    // ═══════════════════════════════════════════════════════════════

    console.log('\n\n⚠️  GAP ANALYSIS: What SME v2.0 Algorithm Misses');
    console.log('═'.repeat(80));

    const noStructuredEligibility = analyses.filter(a =>
      !a.hasTargetCompanyScale && !a.hasTargetSalesRange && !a.hasTargetEmployeeRange && !a.hasTargetBusinessAge
    ).length;

    const textOnlySignals = analyses.filter(a =>
      a.totalSignalsFound > 3 && !a.hasTargetCompanyScale && !a.hasTargetSalesRange
    ).length;

    console.log(`\n  Programs with NO structured eligibility:     ${noStructuredEligibility}/${total} (${((noStructuredEligibility/total)*100).toFixed(0)}%)`);
    console.log(`  Programs with rich text signals + no codes:   ${textOnlySignals}/${total} (${((textOnlySignals/total)*100).toFixed(0)}%)`);
    console.log(`  Programs with implicit requirements in text:  ${signalCounts.implicitReqs}/${total} (${((signalCounts.implicitReqs/total)*100).toFixed(0)}%)`);
    console.log(`  Programs with industry specificity in text:   ${signalCounts.industry}/${total} (${((signalCounts.industry/total)*100).toFixed(0)}%)`);
    console.log(`  Programs with outcome expectations in text:   ${signalCounts.outcomes}/${total} (${((signalCounts.outcomes/total)*100).toFixed(0)}%)`);

    console.log('\n  Key gaps in v2.0:');
    console.log('  1. bizType is only signal for "what kind of support" → but text reveals sub-purposes');
    console.log('  2. Industry matching uses title keywords only → text has richer domain signals');
    console.log('  3. No company stage matching → but text reveals expected maturity level');
    console.log('  4. No implicit requirement matching → text has tech-based, IP, export signals');
    console.log('  5. No outcome alignment → programs expect specific results (jobs, exports, revenue)');

    // Save full analysis to JSON
    const outputPath = path.join(__dirname, '..', 'data', 'sme-announcement-analysis.json');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(analyses, null, 2));
    console.log(`\n\n💾 Full analysis saved to: ${outputPath}`);

    // Final summary
    console.log('\n\n📊 FINAL SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total SME programs analyzed: ${total}`);
    console.log(`Programs with ANY ideal applicant signals: ${analyses.filter(a => a.totalSignalsFound > 0).length}`);
    console.log(`Average signals per program: ${(analyses.reduce((s, a) => s + a.totalSignalsFound, 0) / total).toFixed(1)}`);
    console.log('\nKey findings for ideal profile schema:');
    console.log(`  - ${signalCounts.implicitReqs} programs have implicit requirements (tech-based, IP, social enterprise)`);
    console.log(`  - ${signalCounts.industry} programs have industry domain signals beyond bizType`);
    console.log(`  - ${signalCounts.companyStage} programs indicate preferred company stage`);
    console.log(`  - ${signalCounts.supportPurpose} programs have specific support purposes`);
    console.log(`  - ${signalCounts.outcomes} programs specify expected outcomes`);
    console.log(`  - ${noStructuredEligibility} programs (${((noStructuredEligibility/total)*100).toFixed(0)}%) rely entirely on text for eligibility signals`);

  } catch (error) {
    console.error('Error during analysis:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
