/**
 * Keyword-Based Program Classification System
 *
 * Replaces LLM-based semantic enrichment with deterministic keyword rules
 * derived from actual NTIS program title analysis (450+ programs from 2025-2026).
 *
 * Key Benefits:
 * - Zero LLM cost (vs ~₩27/program)
 * - 100% coverage (vs 39% with LLM)
 * - Predictable & debuggable matching
 * - <10ms processing (vs 2-3 sec/program)
 *
 * Design Principle:
 * - Ministry alone determines 80%+ of matches in Korean R&D ecosystem
 * - Similar ministries have DISTINCT categories to prevent cross-matching
 * - Keywords provide secondary refinement within ministry-determined domains
 *
 * @see /docs/matching-quality-assessment-2026-01-16.md for analysis
 */

// ═══════════════════════════════════════════════════════════════
// Industry Category Types (Extended from existing taxonomy)
// ═══════════════════════════════════════════════════════════════

export type IndustryCategory =
  // Existing categories (from taxonomy.ts)
  | 'BIO_HEALTH'
  | 'ICT'
  | 'MANUFACTURING'
  | 'ENERGY'
  | 'ENVIRONMENT'
  | 'CONSTRUCTION'
  | 'DEFENSE'
  | 'CULTURAL'
  | 'GENERAL'
  // NEW: Separated categories based on user feedback to prevent cross-matching
  | 'MARINE_FISHERIES'   // 해양수산부: 수산, 양식, 어업, 항만, 조선
  | 'MARINE_SECURITY'    // 해양경찰청: VTS, 해양재난, 해양안전, 해양경비
  | 'FORESTRY'           // 산림청: 산림, 임업, 목재, 산불, 산사태
  | 'VETERINARY'         // 농림축산식품부 subset: 반려동물, 동물의약품
  | 'AGRICULTURE'        // 농림축산식품부, 농촌진흥청: 농업, 축산, 식품
  | 'AEROSPACE'          // 우주항공청: 우주, 위성, 항공, 발사체
  | 'TRANSPORTATION';    // 국토교통부 subset: 철도, 교통, 도로

// ═══════════════════════════════════════════════════════════════
// Ministry → Industry Mapping (from actual 2025-2026 CSV data)
// ═══════════════════════════════════════════════════════════════
// 450+ programs analyzed across 25 ministries
// NOTE: Ministries with similar domains now have DISTINCT categories

export const MINISTRY_INDUSTRY_MAP: Record<string, IndustryCategory[]> = {
  // === HEALTH Domain (Human Health) ===
  '보건복지부': ['BIO_HEALTH'],        // 107 programs: 치료, 진단, 백신, 세포, 의료
  '식품의약품안전처': ['BIO_HEALTH'],  // 7 programs: 독성, 규제, 안전성, 의약품 평가
  '질병관리청': ['BIO_HEALTH'],        // Human infectious disease control

  // === MARINE Domain (SEPARATED: Fisheries vs Security) ===
  '해양수산부': ['MARINE_FISHERIES'],   // 56 programs: 수산, 양식, 어업, 항만, 조선
  '해양경찰청': ['MARINE_SECURITY'],    // 14 programs: VTS, 해양재난, 선박충돌

  // === AGRICULTURE Domain (SEPARATED: Farming vs Forestry vs Research) ===
  '농림축산식품부': ['AGRICULTURE', 'VETERINARY'],  // 농업, 축산 + 반려동물, 동물의약품
  '농촌진흥청': ['AGRICULTURE'],        // 50+ programs: 농업연구, 품종개량
  '산림청': ['FORESTRY'],               // 28 programs: 산림, 임업, 목재, 산불

  // === Other Domain-Specific Ministries ===
  '우주항공청': ['AEROSPACE'],          // 21 programs: 우주, 위성, 항공, 발사체
  '기후에너지환경부': ['ENVIRONMENT', 'ENERGY'],  // 29 programs: 기후, 환경, 탄소중립
  '환경부': ['ENVIRONMENT'],            // Environmental protection
  '원자력안전위원회': ['ENERGY'],       // Nuclear energy safety
  '문화체육관광부': ['CULTURAL'],       // 문화, 콘텐츠, 관광, 체육
  '국가유산청': ['CULTURAL'],           // 문화재, 유산
  '문화재청': ['CULTURAL'],             // Legacy name for 국가유산청

  // === Mixed/Cross-Domain Ministries ===
  '과학기술정보통신부': ['BIO_HEALTH', 'ICT'],  // 38 programs: 60% Bio, 40% ICT
  '산업통상자원부': ['MANUFACTURING', 'ENERGY'],  // 소재, 부품, 에너지
  '산업통상부': ['MANUFACTURING', 'ENERGY'],      // Alias
  '국토교통부': ['CONSTRUCTION', 'TRANSPORTATION'],  // 40 programs
  // '중소벤처기업부': ['GENERAL'],     // COMMENTED v4.0: Use keyword-first + scale-based classification
  //                                    // Rationale: ~80% of SME programs are cross-industry (창업성장기술개발, TIPS)
  //                                    // Industry-specific programs (~15-20%) detected by keywords below
  //                                    // See: lib/matching/algorithm.ts for scale + region filtering
  '교육부': ['GENERAL'],                // R&D talent development

  // === Government/Defense Ministries ===
  '국방부': ['DEFENSE'],
  '방위사업청': ['DEFENSE'],
  '경찰청': ['ICT'],                    // Security tech
  '소방청': ['CONSTRUCTION'],           // Fire safety tech

  // === Regulatory/Policy Ministries ===
  '기상청': ['ENVIRONMENT'],
  '기획재정부': ['GENERAL'],
  '고용노동부': ['GENERAL'],
  '개인정보보호위원회': ['ICT'],
  '행정안전부': ['ICT'],                // E-government
};

// ═══════════════════════════════════════════════════════════════
// Keyword → Industry Mapping (from actual 2025-2026 CSV titles)
// ═══════════════════════════════════════════════════════════════
// 450+ programs analyzed - keywords extracted from real NTIS announcements

export const KEYWORD_INDUSTRY_MAP: Record<string, IndustryCategory> = {
  // === BIO_HEALTH (보건복지부, 식품의약품안전처, 질병관리청 - 100+ programs) ===
  '바이오': 'BIO_HEALTH',
  '의료': 'BIO_HEALTH',
  '의료기기': 'BIO_HEALTH',
  '신약': 'BIO_HEALTH',
  '치료': 'BIO_HEALTH',
  '치료제': 'BIO_HEALTH',
  '진단': 'BIO_HEALTH',
  '백신': 'BIO_HEALTH',
  '세포': 'BIO_HEALTH',
  '줄기세포': 'BIO_HEALTH',
  '재생의료': 'BIO_HEALTH',
  '암': 'BIO_HEALTH',
  '치매': 'BIO_HEALTH',
  '정밀의료': 'BIO_HEALTH',
  '헬스케어': 'BIO_HEALTH',
  '희귀질환': 'BIO_HEALTH',
  '간호': 'BIO_HEALTH',
  '중독': 'BIO_HEALTH',
  '재활': 'BIO_HEALTH',
  '감염병': 'BIO_HEALTH',
  '독성': 'BIO_HEALTH',
  '의약품': 'BIO_HEALTH',
  '임상': 'BIO_HEALTH',
  '임상시험': 'BIO_HEALTH',
  '유전체': 'BIO_HEALTH',
  '게놈': 'BIO_HEALTH',
  '뇌': 'BIO_HEALTH',
  '뇌연구': 'BIO_HEALTH',
  '노화': 'BIO_HEALTH',
  '면역': 'BIO_HEALTH',
  '인체': 'BIO_HEALTH',
  '질병': 'BIO_HEALTH',

  // === ICT (과학기술정보통신부, 개인정보보호위원회 - 40+ programs) ===
  'ICT': 'ICT',
  'AI': 'ICT',
  '인공지능': 'ICT',
  '디지털': 'ICT',
  '소프트웨어': 'ICT',
  'SW': 'ICT',
  '정보통신': 'ICT',
  '데이터': 'ICT',
  '빅데이터': 'ICT',
  '클라우드': 'ICT',
  '반도체': 'ICT',
  '양자': 'ICT',
  '양자컴퓨팅': 'ICT',
  '네트워크': 'ICT',
  '5G': 'ICT',
  '6G': 'ICT',
  '사이버': 'ICT',
  '사이버보안': 'ICT',
  '블록체인': 'ICT',
  '메타버스': 'ICT',
  '로봇': 'ICT',
  '자율주행': 'ICT',
  '초연결': 'ICT',
  'IoT': 'ICT',
  '개인정보': 'ICT',
  '플랫폼': 'ICT',
  'XR': 'ICT',

  // === MARINE_FISHERIES (해양수산부 - 56 programs) ===
  // Fisheries, aquaculture, oceanography - DISTINCT from security
  '해양': 'MARINE_FISHERIES',
  '수산': 'MARINE_FISHERIES',
  '해안': 'MARINE_FISHERIES',
  '어업': 'MARINE_FISHERIES',
  '양식': 'MARINE_FISHERIES',
  '항만': 'MARINE_FISHERIES',
  '해운': 'MARINE_FISHERIES',
  '조선': 'MARINE_FISHERIES',
  '선박': 'MARINE_FISHERIES',
  '극지': 'MARINE_FISHERIES',
  '심해': 'MARINE_FISHERIES',
  '연안': 'MARINE_FISHERIES',
  '해저': 'MARINE_FISHERIES',
  '어선': 'MARINE_FISHERIES',
  '수중': 'MARINE_FISHERIES',
  '해초': 'MARINE_FISHERIES',
  '해조류': 'MARINE_FISHERIES',

  // === MARINE_SECURITY (해양경찰청 - 14 programs) ===
  // Maritime safety, security, disaster response - DISTINCT from fisheries
  'VTS': 'MARINE_SECURITY',
  '해양재난': 'MARINE_SECURITY',
  '선박충돌': 'MARINE_SECURITY',
  '해양안전': 'MARINE_SECURITY',
  '해양경비': 'MARINE_SECURITY',
  '해양경찰': 'MARINE_SECURITY',
  '수색구조': 'MARINE_SECURITY',
  '해상교통': 'MARINE_SECURITY',
  '유도선': 'MARINE_SECURITY',

  // === AGRICULTURE (농림축산식품부, 농촌진흥청 - farming, livestock, crops) ===
  '농업': 'AGRICULTURE',
  '농촌': 'AGRICULTURE',
  '축산': 'AGRICULTURE',
  '식품': 'AGRICULTURE',
  '종자': 'AGRICULTURE',
  '농기계': 'AGRICULTURE',
  '스마트팜': 'AGRICULTURE',
  '가축': 'AGRICULTURE',
  '곡물': 'AGRICULTURE',
  '원예': 'AGRICULTURE',
  '작물': 'AGRICULTURE',
  '비료': 'AGRICULTURE',
  '농약': 'AGRICULTURE',
  '육종': 'AGRICULTURE',
  '영농': 'AGRICULTURE',
  '품종': 'AGRICULTURE',
  '수직농장': 'AGRICULTURE',
  '마이크로바이옴': 'AGRICULTURE',
  '그린바이오': 'AGRICULTURE',

  // === VETERINARY (농림축산식품부 - 반려동물, 동물의약품) ===
  // Veterinary medicine - DISTINCT sub-domain within Agriculture ministry
  '반려동물': 'VETERINARY',
  '동물의약품': 'VETERINARY',
  '동물의료기기': 'VETERINARY',
  '동물감염병': 'VETERINARY',
  '수의': 'VETERINARY',
  '가축질병': 'VETERINARY',
  '경제동물': 'VETERINARY',
  '난치성질환극복': 'VETERINARY',
  '동물백신': 'VETERINARY',
  '동물약품': 'VETERINARY',

  // === FORESTRY (산림청 - 28 programs) ===
  // Forestry - DISTINCT from AGRICULTURE (farming)
  '산림': 'FORESTRY',
  '임업': 'FORESTRY',
  '목재': 'FORESTRY',
  '목구조': 'FORESTRY',
  '산불': 'FORESTRY',
  '대형산불': 'FORESTRY',
  '산사태': 'FORESTRY',
  '임도': 'FORESTRY',
  '임산물': 'FORESTRY',
  '한국임업진흥원': 'FORESTRY',

  // === AEROSPACE (우주항공청 - 21 programs) ===
  '우주': 'AEROSPACE',
  '항공': 'AEROSPACE',
  '위성': 'AEROSPACE',
  '로켓': 'AEROSPACE',
  '발사체': 'AEROSPACE',
  '달': 'AEROSPACE',
  '태양계': 'AEROSPACE',
  '드론': 'AEROSPACE',
  'UAM': 'AEROSPACE',
  '천문': 'AEROSPACE',
  '탐사': 'AEROSPACE',

  // === CONSTRUCTION (국토교통부, 소방청 - 40+ programs) ===
  '건설': 'CONSTRUCTION',
  '건축': 'CONSTRUCTION',
  '주거': 'CONSTRUCTION',
  '도시': 'CONSTRUCTION',
  '인프라': 'CONSTRUCTION',
  '터널': 'CONSTRUCTION',
  '교량': 'CONSTRUCTION',
  '소방': 'CONSTRUCTION',
  '방재': 'CONSTRUCTION',
  '재난': 'CONSTRUCTION',
  '스마트시티': 'CONSTRUCTION',

  // === TRANSPORTATION (국토교통부 - subset) ===
  '도로': 'TRANSPORTATION',
  '철도': 'TRANSPORTATION',
  '교통': 'TRANSPORTATION',
  '물류': 'TRANSPORTATION',
  '고속도로': 'TRANSPORTATION',
  '지하철': 'TRANSPORTATION',

  // === ENVIRONMENT (기후에너지환경부, 기상청 - 29 programs) ===
  '환경': 'ENVIRONMENT',
  '기후': 'ENVIRONMENT',
  '대기': 'ENVIRONMENT',
  '폐기물': 'ENVIRONMENT',
  '오염': 'ENVIRONMENT',
  '생태': 'ENVIRONMENT',
  '탄소': 'ENVIRONMENT',
  '탄소중립': 'ENVIRONMENT',
  '기상': 'ENVIRONMENT',
  '수질': 'ENVIRONMENT',
  '미세먼지': 'ENVIRONMENT',
  '녹색': 'ENVIRONMENT',

  // === ENERGY (기후에너지환경부, 원자력안전위원회, 산업통상부) ===
  '에너지': 'ENERGY',
  '배터리': 'ENERGY',
  '수소': 'ENERGY',
  '태양광': 'ENERGY',
  '신재생': 'ENERGY',
  '원자력': 'ENERGY',
  '원전': 'ENERGY',
  '전력': 'ENERGY',
  '풍력': 'ENERGY',
  '핵융합': 'ENERGY',

  // === DEFENSE (국방부, 방위사업청) ===
  '국방': 'DEFENSE',
  '방위': 'DEFENSE',
  '군사': 'DEFENSE',
  '무기': 'DEFENSE',
  '전투': 'DEFENSE',
  '안보': 'DEFENSE',

  // === CULTURAL (문화체육관광부, 국가유산청) ===
  '문화': 'CULTURAL',
  '콘텐츠': 'CULTURAL',
  '관광': 'CULTURAL',
  '체육': 'CULTURAL',
  '스포츠': 'CULTURAL',
  '유산': 'CULTURAL',
  '문화재': 'CULTURAL',
  '예술': 'CULTURAL',
  '미디어': 'CULTURAL',
  '방송': 'CULTURAL',
  '게임': 'CULTURAL',
  'K-콘텐츠': 'CULTURAL',

  // === MANUFACTURING (산업통상부) ===
  '제조': 'MANUFACTURING',
  '소재': 'MANUFACTURING',
  '부품': 'MANUFACTURING',
  '장비': 'MANUFACTURING',
  '기계': 'MANUFACTURING',
  '금속': 'MANUFACTURING',
  '섬유': 'MANUFACTURING',
  '화학': 'MANUFACTURING',
  '플라스틱': 'MANUFACTURING',
  '나노': 'MANUFACTURING',
  '스마트공장': 'MANUFACTURING',

  // === SME-SPECIFIC INDUSTRY DETECTION (중소벤처기업부) ===
  // These keywords identify the ~15-20% of 중소벤처기업부 programs
  // that ARE industry-specific (vs ~80% cross-industry programs)
  '중소제조': 'MANUFACTURING',    // 중소제조 산재예방 기술개발
  '제조산재': 'MANUFACTURING',    // 디지털기반 중소제조 산재예방
  '산재예방': 'MANUFACTURING',    // Industrial accident prevention (manufacturing focus)
  '제조기업': 'MANUFACTURING',    // Manufacturing company specific programs
  '제조혁신': 'MANUFACTURING',    // 스타트 제조혁신 기술개발사업
  '소부장': 'MANUFACTURING',      // 소재부품장비 - 시장대응형(소부장)
  'K-뷰티': 'CULTURAL',           // 시장대응형(K-뷰티)
  '뷰티': 'CULTURAL',             // K-뷰티 cosmetics/beauty programs
  '탄소감축': 'ENVIRONMENT',      // 탄소감축 기술개발

  // === LOCAL VENTURE PROGRAMS (v2.0) ===
  // Local venture programs are REGIONAL, INDUSTRY-AGNOSTIC
  // They focus on utilizing local resources for business innovation
  // Critical: These programs require HARD regional filtering (not just scoring)
  // Example: "2026년 강원 로컬벤처기업 육성사업" → Gangwon-only
  '로컬벤처': 'GENERAL',           // Local venture company programs
  '로컬크리에이터': 'GENERAL',     // Local creator support programs
  '로컬푸드': 'AGRICULTURE',       // Local food (exception: has agriculture focus)
  '지역자원': 'GENERAL',           // Regional resource utilization
  '지역기반': 'GENERAL',           // Regional-based programs
  '지역특화': 'GENERAL',           // Regional specialization programs
};

// ═══════════════════════════════════════════════════════════════
// Cross-Relevance Scores for Related Categories
// ═══════════════════════════════════════════════════════════════
// Used when organization's industry doesn't exactly match program's industry

export const INDUSTRY_CROSS_RELEVANCE: Record<string, Record<string, number>> = {
  // Marine domain separation
  'MARINE_FISHERIES': { 'MARINE_SECURITY': 0.3 },  // Low - different domains
  'MARINE_SECURITY': { 'MARINE_FISHERIES': 0.3 },

  // Agriculture domain
  'FORESTRY': { 'AGRICULTURE': 0.4, 'ENVIRONMENT': 0.5 },  // Moderate overlap
  'AGRICULTURE': { 'FORESTRY': 0.4, 'VETERINARY': 0.7 },   // High with VETERINARY
  'VETERINARY': { 'AGRICULTURE': 0.7, 'BIO_HEALTH': 0.5 }, // Related to both

  // Health domain
  'BIO_HEALTH': { 'VETERINARY': 0.5 },  // Moderate - different target (human vs animal)

  // Construction/Transportation overlap
  'CONSTRUCTION': { 'TRANSPORTATION': 0.6 },
  'TRANSPORTATION': { 'CONSTRUCTION': 0.6 },

  // Energy/Environment overlap
  'ENERGY': { 'ENVIRONMENT': 0.6 },
  'ENVIRONMENT': { 'ENERGY': 0.6 },

  // ICT is cross-domain
  // v4.2.1: Added explicit MARINE/AGRICULTURE/CULTURAL entries to prevent
  // inconsistent defaults (0.2) when keyword-classifier returns these categories
  'ICT': {
    'MANUFACTURING': 0.5,
    'BIO_HEALTH': 0.4,
    'ENERGY': 0.4,
    'CONSTRUCTION': 0.4,
    'TRANSPORTATION': 0.5,
    'MARINE_FISHERIES': 0.2,  // No overlap: SaaS/AI ↔ 선박/수산/양식
    'MARINE_SECURITY': 0.2,   // No overlap: SaaS/AI ↔ VTS/해양안전
    'AGRICULTURE': 0.3,       // Some smart farm/AgTech overlap
    'VETERINARY': 0.2,        // Minimal overlap
    'FORESTRY': 0.2,          // Minimal overlap
    'AEROSPACE': 0.4,         // Satellite data, space ICT
    'CULTURAL': 0.5,          // Digital content, streaming, gaming
    'ENVIRONMENT': 0.3,       // Environmental monitoring/data
  },

  // Aerospace related
  'AEROSPACE': { 'DEFENSE': 0.4, 'MANUFACTURING': 0.5, 'ICT': 0.4 },
  'DEFENSE': { 'AEROSPACE': 0.4, 'MANUFACTURING': 0.4, 'ICT': 0.3 },

  // ============================================================================
  // GENERAL Cross-Industry Programs (중소벤처기업부 cross-industry, 교육부, etc.)
  // ============================================================================
  // GENERAL programs are designed to be industry-agnostic, targeting companies
  // based on size, stage, or location rather than specific industries.
  // Give moderate relevance (0.55) to all industries so cross-industry programs
  // can compete fairly with industry-specific programs in scoring.
  // Without this, GENERAL programs default to 0.2 relevance and can never win.
  'GENERAL': {
    'ICT': 0.55,
    'BIO_HEALTH': 0.55,
    'MANUFACTURING': 0.55,
    'ENERGY': 0.55,
    'ENVIRONMENT': 0.55,
    'CONSTRUCTION': 0.55,
    'TRANSPORTATION': 0.55,
    'AEROSPACE': 0.55,
    'DEFENSE': 0.55,
    'AGRICULTURE': 0.55,
    'FORESTRY': 0.55,
    'VETERINARY': 0.55,
    'MARINE_FISHERIES': 0.55,
    'MARINE_SECURITY': 0.55,
    'CULTURAL': 0.55,
  },
};

// ═══════════════════════════════════════════════════════════════
// Classification Result Interface
// ═══════════════════════════════════════════════════════════════

export interface ClassificationResult {
  industry: IndustryCategory;
  confidence: number;           // 0.0 - 1.0
  matchedKeywords: string[];    // Keywords that matched
  ministryBased: boolean;       // True if ministry was primary determinant
}

// ═══════════════════════════════════════════════════════════════
// Main Classification Function
// ═══════════════════════════════════════════════════════════════

/**
 * Classify a funding program by keywords + ministry
 *
 * Algorithm:
 * 1. Ministry-based base score (10 points per industry)
 * 2. Keyword-based scoring (5 points per matched keyword)
 * 3. Return highest scoring industry
 *
 * @param title - Program title
 * @param programName - Program name (optional)
 * @param ministry - Announcing ministry (부처명)
 * @returns Classification result with industry, confidence, and matched keywords
 */
export function classifyProgram(
  title: string,
  programName: string | null,
  ministry: string | null
): ClassificationResult {
  const matchedKeywords: string[] = [];
  const industryScores: Record<string, number> = {};
  let ministryBased = false;

  // 1. Ministry-based base score (strongest signal - 10 points each)
  if (ministry) {
    const ministryIndustries = MINISTRY_INDUSTRY_MAP[ministry];
    if (ministryIndustries) {
      ministryIndustries.forEach(ind => {
        industryScores[ind] = (industryScores[ind] || 0) + 10;
      });
      ministryBased = true;
    }
  }

  // 2. Keyword-based scoring (5 points per matched keyword)
  const fullText = `${title} ${programName || ''}`;
  for (const [keyword, industry] of Object.entries(KEYWORD_INDUSTRY_MAP)) {
    // Case-insensitive match for Korean text
    if (fullText.includes(keyword)) {
      matchedKeywords.push(keyword);
      industryScores[industry] = (industryScores[industry] || 0) + 5;
    }
  }

  // 3. Return highest scoring industry
  const sortedIndustries = Object.entries(industryScores)
    .sort(([, a], [, b]) => b - a);

  if (sortedIndustries.length === 0) {
    return {
      industry: 'GENERAL',
      confidence: 0.5,
      matchedKeywords: [],
      ministryBased: false,
    };
  }

  const [topIndustry, topScore] = sortedIndustries[0];

  // Normalize confidence to 0-1 range
  // 10 (ministry) + 15 (3 keywords) = 25 → confidence 1.0
  const confidence = Math.min(topScore / 25, 1.0);

  return {
    industry: topIndustry as IndustryCategory,
    confidence,
    matchedKeywords,
    ministryBased,
  };
}

// ═══════════════════════════════════════════════════════════════
// Industry Relevance Calculation
// ═══════════════════════════════════════════════════════════════

/**
 * Get relevance score between two industries
 *
 * @param orgIndustry - Organization's industry sector
 * @param programIndustry - Program's classified industry
 * @returns Relevance score 0.0 - 1.0
 */
export function getIndustryRelevance(
  orgIndustry: string | null,
  programIndustry: IndustryCategory
): number {
  if (!orgIndustry) return 0.5; // Default moderate relevance

  // Normalize org industry to match our categories
  const normalizedOrg = normalizeIndustry(orgIndustry);

  // Exact match
  if (normalizedOrg === programIndustry) {
    return 1.0;
  }

  // Check cross-relevance matrix
  const crossRelevance = INDUSTRY_CROSS_RELEVANCE[normalizedOrg]?.[programIndustry];
  if (crossRelevance !== undefined) {
    return crossRelevance;
  }

  // Reverse check (symmetry)
  const reverseRelevance = INDUSTRY_CROSS_RELEVANCE[programIndustry]?.[normalizedOrg];
  if (reverseRelevance !== undefined) {
    return reverseRelevance;
  }

  // Default low relevance for unrelated industries
  return 0.2;
}

/**
 * Normalize organization industry sector to our categories
 * Handles legacy values and variations
 */
function normalizeIndustry(industry: string): IndustryCategory {
  const upper = industry.toUpperCase();

  // Direct matches
  const directMatches: Record<string, IndustryCategory> = {
    'BIO_HEALTH': 'BIO_HEALTH',
    'BIOHEALTH': 'BIO_HEALTH',
    'BIO': 'BIO_HEALTH',
    'HEALTH': 'BIO_HEALTH',
    'ICT': 'ICT',
    'IT': 'ICT',
    'SOFTWARE': 'ICT',
    'MANUFACTURING': 'MANUFACTURING',
    'MANUFACTURE': 'MANUFACTURING',
    'ENERGY': 'ENERGY',
    'ENVIRONMENT': 'ENVIRONMENT',
    'ENV': 'ENVIRONMENT',
    'CONSTRUCTION': 'CONSTRUCTION',
    'DEFENSE': 'DEFENSE',
    'CULTURAL': 'CULTURAL',
    'CONTENT': 'CULTURAL',
    'MARINE': 'MARINE_FISHERIES',
    'MARINE_FISHERIES': 'MARINE_FISHERIES',
    'MARINE_SECURITY': 'MARINE_SECURITY',
    'FORESTRY': 'FORESTRY',
    'AGRICULTURE': 'AGRICULTURE',
    'AGRI': 'AGRICULTURE',
    'VETERINARY': 'VETERINARY',
    'VET': 'VETERINARY',
    'AEROSPACE': 'AEROSPACE',
    'TRANSPORTATION': 'TRANSPORTATION',
    'TRANSPORT': 'TRANSPORTATION',
    'GENERAL': 'GENERAL',
    'OTHER': 'GENERAL',
  };

  return directMatches[upper] || 'GENERAL';
}

// ═══════════════════════════════════════════════════════════════
// Utility: Get Korean Label for Industry
// ═══════════════════════════════════════════════════════════════

export const INDUSTRY_KOREAN_LABELS: Record<IndustryCategory, string> = {
  'BIO_HEALTH': '바이오/헬스케어',
  'ICT': 'ICT/정보통신',
  'MANUFACTURING': '제조업',
  'ENERGY': '에너지',
  'ENVIRONMENT': '환경',
  'CONSTRUCTION': '건설',
  'DEFENSE': '국방/방위',
  'CULTURAL': '문화/콘텐츠',
  'GENERAL': '일반/범용',
  'MARINE_FISHERIES': '해양/수산',
  'MARINE_SECURITY': '해양안전/경비',
  'FORESTRY': '산림/임업',
  'AGRICULTURE': '농업/축산',
  'VETERINARY': '수의/동물의약',
  'AEROSPACE': '우주항공',
  'TRANSPORTATION': '교통/물류',
};

export function getIndustryKoreanLabel(industry: IndustryCategory): string {
  return INDUSTRY_KOREAN_LABELS[industry] || industry;
}

// ═══════════════════════════════════════════════════════════════
// Regional Program Detection (v2.0)
// ═══════════════════════════════════════════════════════════════

/**
 * Keywords that indicate a program requires regional filtering.
 *
 * These programs are designed for companies in specific regions and should
 * NOT be shown to companies outside those regions (hard filter, not soft scoring).
 *
 * Categories:
 * - Local Venture: 로컬벤처, 로컬크리에이터, 지역자원
 * - Regional Innovation: 지역혁신, 지역특화
 * - Specific Region: 강원, 부산, 대구 etc. (handled by extractRegionFromTitle)
 */
const REGIONAL_REQUIRED_KEYWORDS = [
  '로컬벤처',
  '로컬크리에이터',
  '로컬푸드',
  '지역자원',
  '지역기반',
  '지역특화',
  '지역혁신선도',
  '지역혁신',
  '지역주도',
];

/**
 * Check if a program requires regional filtering based on keywords.
 *
 * v2.0 Enhancement (2026-01-29):
 * These programs are industry-agnostic but REGION-SPECIFIC.
 * Companies outside the target region should NOT see these programs.
 *
 * Example: "2026년 강원 로컬벤처기업 육성사업"
 * - Industry: GENERAL (any industry eligible)
 * - Region: HARD REQUIREMENT (Gangwon only)
 *
 * @param title Program title
 * @param description Optional program description
 * @returns true if program requires regional filtering
 */
export function isRegionalRequiredProgram(title: string, description?: string | null): boolean {
  const text = `${title} ${description || ''}`.toLowerCase();

  return REGIONAL_REQUIRED_KEYWORDS.some(keyword =>
    text.includes(keyword.toLowerCase())
  );
}

/**
 * Extended classification result with regional flag
 */
export interface ExtendedClassificationResult extends ClassificationResult {
  requiresRegionalFilter: boolean;
  regionalKeywords: string[];
}

/**
 * Classify program with extended regional detection
 *
 * @param title Program title
 * @param programName Program name (optional)
 * @param ministry Announcing ministry (optional)
 * @param description Program description (optional)
 * @returns Extended classification with regional flag
 */
export function classifyProgramExtended(
  title: string,
  programName: string | null,
  ministry: string | null,
  description?: string | null
): ExtendedClassificationResult {
  // Get base classification
  const baseResult = classifyProgram(title, programName, ministry);

  // Check for regional requirement
  const text = `${title} ${programName || ''} ${description || ''}`.toLowerCase();
  const matchedRegionalKeywords = REGIONAL_REQUIRED_KEYWORDS.filter(keyword =>
    text.includes(keyword.toLowerCase())
  );

  return {
    ...baseResult,
    requiresRegionalFilter: matchedRegionalKeywords.length > 0,
    regionalKeywords: matchedRegionalKeywords,
  };
}
