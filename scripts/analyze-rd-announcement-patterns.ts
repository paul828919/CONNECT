/**
 * R&D Announcement Pattern Analysis Script
 * Phase 1.1: Ideal Profile Construction & Proximity Matching
 *
 * Reads 50+ diverse funding_programs from the database, analyzes each for
 * "ideal applicant" signals that go beyond current field-to-field matching.
 *
 * Outputs structured analysis per program showing:
 * 1. Organizational stage expectations (basic research vs commercialization)
 * 2. Technology maturity signals (beyond raw TRL numbers)
 * 3. Domain specificity within industries
 * 4. Financial profile expectations
 * 5. Collaboration/consortium expectations
 * 6. Regional requirements beyond geography
 * 7. Implicit competency requirements (GMP, patents, clinical trials)
 * 8. Program intent/desired outcomes (papers? commercialization? exports? jobs?)
 *
 * Usage: npx tsx scripts/analyze-rd-announcement-patterns.ts
 */

import { PrismaClient, ProgramStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// Signal Extraction Patterns (Korean)
// ═══════════════════════════════════════════════════════════════

/** Organizational stage signals extracted from announcement text */
const ORG_STAGE_PATTERNS: Record<string, RegExp[]> = {
  BASIC_RESEARCH: [
    /기초연구/g, /원천기술/g, /기반연구/g, /탐색연구/g,
    /기초과학/g, /원천연구/g, /원천성/g,
  ],
  APPLIED_RESEARCH: [
    /응용연구/g, /핵심기술/g, /기술실증/g, /파일럿/g,
    /시제품/g, /프로토타입/g, /개발연구/g,
  ],
  COMMERCIALIZATION: [
    /상용화/g, /사업화/g, /기술이전/g, /제품화/g,
    /시장진출/g, /양산/g, /시장창출/g, /실용화/g,
    /수출/g, /글로벌/g, /해외시장/g,
  ],
  STARTUP_FOCUSED: [
    /창업/g, /스타트업/g, /예비창업/g, /초기창업/g,
    /벤처/g, /기술창업/g,
  ],
};

/** Collaboration expectation signals */
const COLLABORATION_PATTERNS: Record<string, RegExp[]> = {
  CONSORTIUM_REQUIRED: [
    /컨소시엄/g, /공동연구/g, /산학연/g, /연구단/g,
    /공동수행/g, /참여기관/g, /주관기관.*참여기관/g,
  ],
  INDUSTRY_ACADEMIA: [
    /산학/g, /산학협력/g, /산학연.*협력/g,
    /대학.*기업/g, /기업.*대학/g,
  ],
  SOLO_ELIGIBLE: [
    /단독.*수행/g, /단독.*신청/g, /개별.*과제/g,
  ],
};

/** Implicit competency/certification signals */
const COMPETENCY_PATTERNS: Record<string, RegExp[]> = {
  GMP: [/GMP/g, /제조.*관리.*기준/g, /의약품.*제조/g],
  CLINICAL_TRIAL: [/임상/g, /임상시험/g, /임상.*단계/g, /IND/g, /IRB/g],
  PATENT: [/특허/g, /지식재산/g, /IP/g, /지재권/g],
  ISO_CERT: [/ISO/g, /국제인증/g, /국제표준/g, /인증.*획득/g],
  EXPORT_CAPABILITY: [/수출/g, /해외.*진출/g, /글로벌/g, /현지화/g],
  SECURITY_CLEARANCE: [/보안.*과제/g, /비밀.*취급/g, /보안등급/g],
  RESEARCH_INFRA: [/연구시설/g, /연구장비/g, /실험실/g, /연구인프라/g],
  TRACK_RECORD: [/실적/g, /수행.*경험/g, /수행실적/g, /기.*수행/g],
};

/** Program outcome/intent signals */
const OUTCOME_PATTERNS: Record<string, RegExp[]> = {
  PAPERS: [/논문/g, /SCI/g, /학술/g, /학회/g, /저널/g],
  COMMERCIALIZATION: [/상용화/g, /사업화/g, /제품화/g, /양산/g, /매출/g],
  TECHNOLOGY_TRANSFER: [/기술이전/g, /기술실시/g, /라이선스/g, /기술료/g],
  JOB_CREATION: [/일자리/g, /고용/g, /인력양성/g, /채용/g],
  EXPORT: [/수출/g, /해외시장/g, /글로벌.*시장/g, /수출액/g],
  STANDARD_SETTING: [/표준/g, /표준화/g, /국제표준/g, /규격/g],
  SOCIAL_IMPACT: [/사회적/g, /공공/g, /국민/g, /안전/g, /환경/g],
};

/** Financial profile expectations */
const FINANCIAL_PATTERNS: Record<string, RegExp[]> = {
  MATCHING_FUND: [/대응자금/g, /매칭.*펀드/g, /자부담/g, /민간.*부담/g],
  REVENUE_REQUIREMENT: [/매출.*이상/g, /매출액.*억/g, /매출.*규모/g],
  INVESTMENT_RECEIVED: [/투자.*유치/g, /투자.*받은/g, /VC/g, /엔젤/g],
  LARGE_SCALE: [/총.*사업비.*억/g, /연구비.*억/g, /지원.*규모.*억/g],
};

/** Domain specificity sub-patterns (within broad industries) */
const DOMAIN_SPECIFICITY_PATTERNS: Record<string, RegExp[]> = {
  // BIO_HEALTH sub-domains
  DRUG_DEVELOPMENT: [/신약/g, /의약품/g, /약물/g, /바이오시밀러/g, /항체/g],
  MEDICAL_DEVICE: [/의료기기/g, /진단기기/g, /체외진단/g, /IVD/g],
  DIGITAL_HEALTH: [/디지털.*헬스/g, /디지털.*치료/g, /원격의료/g, /mHealth/g],
  VETERINARY: [/동물/g, /수의/g, /동물의약/g, /반려동물/g, /가축/g],
  FOOD_SAFETY: [/식품/g, /식품안전/g, /기능성.*식품/g, /건강기능/g],

  // ICT sub-domains
  AI_ML: [/인공지능/g, /AI/g, /머신러닝/g, /딥러닝/g, /자연어처리/g],
  CYBERSECURITY: [/사이버보안/g, /정보보안/g, /보안/g, /암호/g],
  SEMICONDUCTOR: [/반도체/g, /시스템반도체/g, /파운드리/g, /팹리스/g],
  QUANTUM: [/양자/g, /양자컴퓨팅/g, /양자통신/g, /양자센서/g],

  // ENERGY sub-domains
  HYDROGEN: [/수소/g, /수소경제/g, /수소연료전지/g, /그린수소/g],
  NUCLEAR: [/원자력/g, /핵융합/g, /방사선/g, /원자로/g],
  RENEWABLE: [/재생에너지/g, /태양광/g, /풍력/g, /ESS/g],
  CARBON_NEUTRAL: [/탄소중립/g, /탄소포집/g, /CCUS/g, /온실가스/g],

  // MANUFACTURING sub-domains
  ROBOTICS: [/로봇/g, /자동화/g, /협동로봇/g, /스마트공장/g],
  MATERIALS: [/소재/g, /신소재/g, /나노/g, /복합소재/g, /세라믹/g],
  SPACE: [/우주/g, /위성/g, /발사체/g, /항공우주/g, /궤도/g],
  DEFENSE: [/국방/g, /방위/g, /무기체계/g, /군사/g],
};

/** Regional requirement patterns beyond simple geography */
const REGIONAL_PATTERNS: Record<string, RegExp[]> = {
  NATIONWIDE: [/전국/g, /제한.*없/g],
  NON_METROPOLITAN: [/비수도권/g, /지방/g, /지역.*혁신/g],
  SPECIFIC_REGION: [
    /대전/g, /세종/g, /광주/g, /대구/g, /부산/g, /제주/g,
    /강원/g, /충북/g, /충남/g, /전북/g, /전남/g, /경북/g, /경남/g,
  ],
  TECHNOPARK: [/테크노파크/g, /혁신도시/g, /과학산업단지/g, /연구단지/g],
};

// ═══════════════════════════════════════════════════════════════
// Analysis Functions
// ═══════════════════════════════════════════════════════════════

interface SignalMatch {
  category: string;
  signal: string;
  count: number;
  matchedText: string[];
}

interface ProgramAnalysis {
  programId: string;
  title: string;
  ministry: string | null;
  agencyId: string;
  status: string;
  deadline: Date | null;

  // Current matching fields
  targetType: string[];
  minTrl: number | null;
  maxTrl: number | null;
  keywords: string[];
  category: string | null;

  // Discovered ideal applicant signals
  orgStageSignals: SignalMatch[];
  collaborationSignals: SignalMatch[];
  competencySignals: SignalMatch[];
  outcomeSignals: SignalMatch[];
  financialSignals: SignalMatch[];
  domainSpecificitySignals: SignalMatch[];
  regionalSignals: SignalMatch[];

  // Text availability
  hasDescription: boolean;
  descriptionLength: number;
  hasEligibilityCriteria: boolean;
  eligibilityFieldCount: number;
  hasAttachments: boolean;
  attachmentCount: number;

  // Summary
  totalSignalsFound: number;
  signalDensity: number; // signals per 1000 chars
  missedByCurrentAlgorithm: string[];
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
      // Reset regex state
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
        signal: category.replace(/_/g, ' ').toLowerCase(),
        count: totalCount,
        matchedText: Array.from(new Set(matchedTexts)).slice(0, 5), // Keep top 5 unique matches
      });
    }
  }

  return signals;
}

function analyzeProgram(program: {
  id: string;
  title: string;
  ministry: string | null;
  agencyId: string;
  status: ProgramStatus;
  deadline: Date | null;
  targetType: string[];
  minTrl: number | null;
  maxTrl: number | null;
  keywords: string[];
  category: string | null;
  description: string | null;
  eligibilityCriteria: unknown;
  attachmentUrls: string[];
  requiredCertifications: string[];
  preferredCertifications: string[];
  requiredMinEmployees: number | null;
  requiredMaxEmployees: number | null;
  requiredMinRevenue: bigint | null;
  requiredMaxRevenue: bigint | null;
  requiredOperatingYears: number | null;
  maxOperatingYears: number | null;
  requiresResearchInstitute: boolean;
}): ProgramAnalysis {
  // Combine all available text for analysis
  const textParts: string[] = [program.title];
  if (program.description) textParts.push(program.description);
  if (program.eligibilityCriteria) {
    const ec = program.eligibilityCriteria as Record<string, unknown>;
    textParts.push(JSON.stringify(ec));
  }
  if (program.keywords.length > 0) textParts.push(program.keywords.join(' '));

  const fullText = textParts.join('\n');

  // Extract signals from all pattern categories
  const orgStageSignals = extractSignals(fullText, ORG_STAGE_PATTERNS);
  const collaborationSignals = extractSignals(fullText, COLLABORATION_PATTERNS);
  const competencySignals = extractSignals(fullText, COMPETENCY_PATTERNS);
  const outcomeSignals = extractSignals(fullText, OUTCOME_PATTERNS);
  const financialSignals = extractSignals(fullText, FINANCIAL_PATTERNS);
  const domainSpecificitySignals = extractSignals(fullText, DOMAIN_SPECIFICITY_PATTERNS);
  const regionalSignals = extractSignals(fullText, REGIONAL_PATTERNS);

  // Count eligibility fields that are actually populated
  let eligibilityFieldCount = 0;
  if (program.requiredCertifications.length > 0) eligibilityFieldCount++;
  if (program.preferredCertifications.length > 0) eligibilityFieldCount++;
  if (program.requiredMinEmployees !== null) eligibilityFieldCount++;
  if (program.requiredMaxEmployees !== null) eligibilityFieldCount++;
  if (program.requiredMinRevenue !== null) eligibilityFieldCount++;
  if (program.requiredMaxRevenue !== null) eligibilityFieldCount++;
  if (program.requiredOperatingYears !== null) eligibilityFieldCount++;
  if (program.maxOperatingYears !== null) eligibilityFieldCount++;
  if (program.requiresResearchInstitute) eligibilityFieldCount++;

  const totalSignals =
    orgStageSignals.length +
    collaborationSignals.length +
    competencySignals.length +
    outcomeSignals.length +
    financialSignals.length +
    domainSpecificitySignals.length +
    regionalSignals.length;

  // Identify signals that current algorithm misses
  const missedByCurrentAlgorithm: string[] = [];
  if (orgStageSignals.length > 0) {
    missedByCurrentAlgorithm.push(
      `Org stage: ${orgStageSignals.map(s => s.category).join(', ')}`
    );
  }
  if (competencySignals.length > 0) {
    missedByCurrentAlgorithm.push(
      `Competencies: ${competencySignals.map(s => s.category).join(', ')}`
    );
  }
  if (collaborationSignals.length > 0) {
    missedByCurrentAlgorithm.push(
      `Collaboration: ${collaborationSignals.map(s => s.category).join(', ')}`
    );
  }
  if (financialSignals.length > 0) {
    missedByCurrentAlgorithm.push(
      `Financial: ${financialSignals.map(s => s.category).join(', ')}`
    );
  }
  if (outcomeSignals.length > 0) {
    missedByCurrentAlgorithm.push(
      `Outcomes: ${outcomeSignals.map(s => s.category).join(', ')}`
    );
  }
  if (domainSpecificitySignals.length > 1) {
    missedByCurrentAlgorithm.push(
      `Sub-domains: ${domainSpecificitySignals.map(s => s.category).join(', ')}`
    );
  }

  return {
    programId: program.id,
    title: program.title,
    ministry: program.ministry,
    agencyId: program.agencyId,
    status: program.status,
    deadline: program.deadline,
    targetType: program.targetType,
    minTrl: program.minTrl,
    maxTrl: program.maxTrl,
    keywords: program.keywords,
    category: program.category,
    orgStageSignals,
    collaborationSignals,
    competencySignals,
    outcomeSignals,
    financialSignals,
    domainSpecificitySignals,
    regionalSignals,
    hasDescription: !!program.description,
    descriptionLength: program.description?.length || 0,
    hasEligibilityCriteria: !!program.eligibilityCriteria,
    eligibilityFieldCount,
    hasAttachments: program.attachmentUrls.length > 0,
    attachmentCount: program.attachmentUrls.length,
    totalSignalsFound: totalSignals,
    signalDensity: fullText.length > 0 ? (totalSignals / fullText.length) * 1000 : 0,
    missedByCurrentAlgorithm,
  };
}

// ═══════════════════════════════════════════════════════════════
// Main Analysis
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🔍 R&D Announcement Pattern Analysis');
  console.log('═'.repeat(80));
  console.log('Goal: Discover "ideal applicant" signals missed by current matching\n');

  try {
    // Get distinct ministries to ensure diversity
    const ministries = await prisma.funding_programs.findMany({
      where: { status: ProgramStatus.ACTIVE },
      select: { ministry: true },
      distinct: ['ministry'],
    });

    const uniqueMinistries = ministries
      .map(m => m.ministry)
      .filter((m): m is string => m !== null);

    console.log(`📊 Found ${uniqueMinistries.length} distinct ministries`);
    console.log(`   Ministries: ${uniqueMinistries.join(', ')}\n`);

    // Sample programs across ministries for diversity
    const programs: Awaited<ReturnType<typeof prisma.funding_programs.findMany>> = [];
    const programsPerMinistry = Math.max(3, Math.ceil(50 / uniqueMinistries.length));

    for (const ministry of uniqueMinistries) {
      const batch = await prisma.funding_programs.findMany({
        where: {
          ministry,
          status: ProgramStatus.ACTIVE,
        },
        take: programsPerMinistry,
        orderBy: { scrapedAt: 'desc' },
      });
      programs.push(...batch);
    }

    // Also get some without ministry assignment for coverage
    const noMinistry = await prisma.funding_programs.findMany({
      where: {
        ministry: null,
        status: ProgramStatus.ACTIVE,
      },
      take: 5,
      orderBy: { scrapedAt: 'desc' },
    });
    programs.push(...noMinistry);

    console.log(`📋 Analyzing ${programs.length} programs across ${uniqueMinistries.length}+ ministries\n`);
    console.log('═'.repeat(80));

    // Analyze each program
    const analyses: ProgramAnalysis[] = [];
    for (const program of programs) {
      const analysis = analyzeProgram(program);
      analyses.push(analysis);
    }

    // ═══════════════════════════════════════════════════════════════
    // Aggregate Statistics
    // ═══════════════════════════════════════════════════════════════

    console.log('\n\n📈 AGGREGATE SIGNAL STATISTICS');
    console.log('═'.repeat(80));

    // Signal prevalence
    const signalCounts = {
      orgStage: 0,
      collaboration: 0,
      competency: 0,
      outcome: 0,
      financial: 0,
      domainSpecificity: 0,
      regional: 0,
    };

    for (const a of analyses) {
      if (a.orgStageSignals.length > 0) signalCounts.orgStage++;
      if (a.collaborationSignals.length > 0) signalCounts.collaboration++;
      if (a.competencySignals.length > 0) signalCounts.competency++;
      if (a.outcomeSignals.length > 0) signalCounts.outcome++;
      if (a.financialSignals.length > 0) signalCounts.financial++;
      if (a.domainSpecificitySignals.length > 0) signalCounts.domainSpecificity++;
      if (a.regionalSignals.length > 0) signalCounts.regional++;
    }

    const total = analyses.length;
    console.log(`\nSignal Prevalence (out of ${total} programs):`);
    console.log(`  Org Stage Signals:       ${signalCounts.orgStage} (${((signalCounts.orgStage/total)*100).toFixed(1)}%)`);
    console.log(`  Collaboration Signals:   ${signalCounts.collaboration} (${((signalCounts.collaboration/total)*100).toFixed(1)}%)`);
    console.log(`  Competency Signals:      ${signalCounts.competency} (${((signalCounts.competency/total)*100).toFixed(1)}%)`);
    console.log(`  Outcome Signals:         ${signalCounts.outcome} (${((signalCounts.outcome/total)*100).toFixed(1)}%)`);
    console.log(`  Financial Signals:       ${signalCounts.financial} (${((signalCounts.financial/total)*100).toFixed(1)}%)`);
    console.log(`  Domain Specificity:      ${signalCounts.domainSpecificity} (${((signalCounts.domainSpecificity/total)*100).toFixed(1)}%)`);
    console.log(`  Regional Signals:        ${signalCounts.regional} (${((signalCounts.regional/total)*100).toFixed(1)}%)`);

    // Detailed sub-category prevalence
    console.log('\n\n📊 DETAILED SIGNAL BREAKDOWN');
    console.log('═'.repeat(80));

    const subCategoryCounts: Record<string, number> = {};
    for (const a of analyses) {
      const allSignals = [
        ...a.orgStageSignals,
        ...a.collaborationSignals,
        ...a.competencySignals,
        ...a.outcomeSignals,
        ...a.financialSignals,
        ...a.domainSpecificitySignals,
        ...a.regionalSignals,
      ];
      for (const s of allSignals) {
        subCategoryCounts[s.category] = (subCategoryCounts[s.category] || 0) + 1;
      }
    }

    const sortedSubCategories = Object.entries(subCategoryCounts)
      .sort((a, b) => b[1] - a[1]);

    for (const [cat, count] of sortedSubCategories) {
      const bar = '█'.repeat(Math.ceil((count / total) * 40));
      console.log(`  ${cat.padEnd(25)} ${String(count).padStart(3)} (${((count/total)*100).toFixed(0).padStart(3)}%) ${bar}`);
    }

    // Text availability analysis
    console.log('\n\n📝 TEXT AVAILABILITY');
    console.log('═'.repeat(80));

    const withDescription = analyses.filter(a => a.hasDescription).length;
    const withEligibility = analyses.filter(a => a.hasEligibilityCriteria).length;
    const withAttachments = analyses.filter(a => a.hasAttachments).length;
    const avgDescLength = analyses.reduce((s, a) => s + a.descriptionLength, 0) / total;
    const avgEligFields = analyses.reduce((s, a) => s + a.eligibilityFieldCount, 0) / total;

    console.log(`  Has Description:         ${withDescription}/${total} (${((withDescription/total)*100).toFixed(0)}%)`);
    console.log(`  Avg Description Length:   ${avgDescLength.toFixed(0)} chars`);
    console.log(`  Has Eligibility Criteria: ${withEligibility}/${total} (${((withEligibility/total)*100).toFixed(0)}%)`);
    console.log(`  Avg Eligibility Fields:   ${avgEligFields.toFixed(1)} fields populated`);
    console.log(`  Has Attachments:          ${withAttachments}/${total} (${((withAttachments/total)*100).toFixed(0)}%)`);

    // Sample detailed analyses (top 20 most signal-rich programs)
    console.log('\n\n🔬 TOP 20 MOST SIGNAL-RICH PROGRAMS');
    console.log('═'.repeat(80));

    const topPrograms = [...analyses]
      .sort((a, b) => b.totalSignalsFound - a.totalSignalsFound)
      .slice(0, 20);

    for (const [idx, a] of topPrograms.entries()) {
      console.log(`\n${idx + 1}. ${a.title}`);
      console.log(`   Ministry: ${a.ministry || 'N/A'} | TRL: ${a.minTrl ?? '?'}-${a.maxTrl ?? '?'} | Signals: ${a.totalSignalsFound}`);
      console.log(`   Target Type: ${a.targetType.join(', ') || 'N/A'}`);
      console.log(`   Keywords: ${a.keywords.slice(0, 5).join(', ')}`);

      if (a.orgStageSignals.length > 0) {
        console.log(`   📌 Org Stage: ${a.orgStageSignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.collaborationSignals.length > 0) {
        console.log(`   🤝 Collaboration: ${a.collaborationSignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.competencySignals.length > 0) {
        console.log(`   🏆 Competency: ${a.competencySignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.outcomeSignals.length > 0) {
        console.log(`   🎯 Outcomes: ${a.outcomeSignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.financialSignals.length > 0) {
        console.log(`   💰 Financial: ${a.financialSignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.domainSpecificitySignals.length > 0) {
        console.log(`   🧬 Sub-domains: ${a.domainSpecificitySignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.regionalSignals.length > 0) {
        console.log(`   📍 Regional: ${a.regionalSignals.map(s => `${s.category}(${s.count})`).join(', ')}`);
      }
      if (a.missedByCurrentAlgorithm.length > 0) {
        console.log(`   ⚠️  Missed by v4.4: ${a.missedByCurrentAlgorithm.join(' | ')}`);
      }
    }

    // Ministry-level pattern summary
    console.log('\n\n🏛️ MINISTRY-LEVEL PATTERN SUMMARY');
    console.log('═'.repeat(80));

    const byMinistry = new Map<string, ProgramAnalysis[]>();
    for (const a of analyses) {
      const key = a.ministry || 'Unknown';
      if (!byMinistry.has(key)) byMinistry.set(key, []);
      byMinistry.get(key)!.push(a);
    }

    for (const [ministry, ministryAnalyses] of byMinistry) {
      const n = ministryAnalyses.length;
      const avgSignals = ministryAnalyses.reduce((s, a) => s + a.totalSignalsFound, 0) / n;

      // Most common signals for this ministry
      const ministrySignals: Record<string, number> = {};
      for (const a of ministryAnalyses) {
        const allSignals = [
          ...a.orgStageSignals,
          ...a.collaborationSignals,
          ...a.competencySignals,
          ...a.outcomeSignals,
          ...a.financialSignals,
          ...a.domainSpecificitySignals,
        ];
        for (const s of allSignals) {
          ministrySignals[s.category] = (ministrySignals[s.category] || 0) + 1;
        }
      }

      const topSignals = Object.entries(ministrySignals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => `${cat}(${count}/${n})`)
        .join(', ');

      console.log(`\n  ${ministry} (${n} programs, avg ${avgSignals.toFixed(1)} signals)`);
      console.log(`    Top signals: ${topSignals || 'none'}`);
    }

    // Save full analysis to JSON for Phase 1.3 documentation
    const outputPath = path.join(__dirname, '..', 'data', 'rd-announcement-analysis.json');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Serialize with BigInt handling
    const serializable = analyses.map(a => ({
      ...a,
      deadline: a.deadline?.toISOString() || null,
    }));

    fs.writeFileSync(outputPath, JSON.stringify(serializable, null, 2));
    console.log(`\n\n💾 Full analysis saved to: ${outputPath}`);

    // Summary
    console.log('\n\n📊 FINAL SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total programs analyzed: ${total}`);
    console.log(`Programs with ANY ideal applicant signals: ${analyses.filter(a => a.totalSignalsFound > 0).length}`);
    console.log(`Average signals per program: ${(analyses.reduce((s, a) => s + a.totalSignalsFound, 0) / total).toFixed(1)}`);
    console.log(`Programs with signals missed by v4.4: ${analyses.filter(a => a.missedByCurrentAlgorithm.length > 0).length}`);
    console.log('\nKey findings for ideal profile schema design:');
    console.log(`  - ${signalCounts.competency} programs have implicit competency requirements`);
    console.log(`  - ${signalCounts.outcome} programs specify desired outcomes (papers, commercialization, etc.)`);
    console.log(`  - ${signalCounts.orgStage} programs indicate preferred organizational stage`);
    console.log(`  - ${signalCounts.collaboration} programs specify collaboration expectations`);
    console.log(`  - ${signalCounts.domainSpecificity} programs have domain-specific sub-field requirements`);

  } catch (error) {
    console.error('Error during analysis:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
