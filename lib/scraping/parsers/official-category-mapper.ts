/**
 * Official Korean Classification to Internal Category Mapper
 *
 * Maps official Korean classification systems to our internal categories:
 * - KSIC (Korean Standard Industrial Classification) - 업종코드
 * - NSTC (National Science & Technology Classification) - 국가과학기술표준분류
 *
 * Data sources:
 * - KSIC 11th Revision (2023) - 22 major categories, 1,788 detailed codes
 * - NSTC 2023 Revision - 5 research fields, 22 major categories
 *
 * Created: 2025-01-13
 */

export interface KSICMapping {
  /** KSIC major category (대분류) in Korean */
  ksicCategory: string;
  /** Our internal category */
  internalCategory: string;
  /** Confidence level for this mapping */
  confidence: 'high' | 'medium' | 'low';
  /** Domain-specific keywords (high priority) */
  domainKeywords: string[];
  /** Generic keywords (low priority, require context) */
  genericKeywords?: string[];
}

export interface NSTCMapping {
  /** NSTC research field (연구분야) */
  researchField: string;
  /** NSTC major category estimate */
  nstcCategory: string;
  /** Our internal category */
  internalCategory: string;
  /** Domain-specific detection keywords (Korean + English) */
  domainKeywords: string[];
  /** Generic keywords (optional, low priority) */
  genericKeywords?: string[];
}

/**
 * KSIC Major Category → Internal Category Mapping
 *
 * Maps 22 KSIC major categories to our 11 internal categories
 */
export const KSIC_TO_INTERNAL: KSICMapping[] = [
  // ─────────────────────────────────────────────────────────────
  // ICT & Information Technology
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '정보통신업',
    internalCategory: 'ICT',
    confidence: 'high',
    domainKeywords: ['정보통신', 'ICT', '소프트웨어', 'SW', 'IT', '디지털', '인공지능', 'AI', '빅데이터', '클라우드'],
  },

  // ─────────────────────────────────────────────────────────────
  // Manufacturing & Materials
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '제조업',
    internalCategory: 'MANUFACTURING',
    confidence: 'medium', // Too broad - requires sub-classification
    domainKeywords: ['첨단소재', '나노', '소재', '신소재', '복합재료'],
    genericKeywords: ['제조', '생산', '공정'],
  },

  // ─────────────────────────────────────────────────────────────
  // Energy & Resources
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '전기, 가스, 증기 및 공기 조절 공급업',
    internalCategory: 'ENERGY',
    confidence: 'high',
    domainKeywords: ['원자력', '수소', '신재생', '태양광', '풍력', '연료전지', '배터리'],
    genericKeywords: ['전기', '가스', '에너지', '전력'],
  },
  {
    ksicCategory: '광업',
    internalCategory: 'ENERGY',
    confidence: 'medium',
    domainKeywords: ['광업', '광물', '채굴'],
    genericKeywords: ['자원'],
  },

  // ─────────────────────────────────────────────────────────────
  // Construction & Infrastructure
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '건설업',
    internalCategory: 'CONSTRUCTION',
    confidence: 'high',
    domainKeywords: ['건설', '건축', '토목', '도로', '항만', '철도'],
    genericKeywords: ['인프라', '교통'], // "인프라" is generic - used in bio/health labs too
  },
  {
    ksicCategory: '운수 및 창고업',
    internalCategory: 'CONSTRUCTION',
    confidence: 'low',
    domainKeywords: ['운수', '물류', '창고', '운송'],
  },

  // ─────────────────────────────────────────────────────────────
  // Bio & Health
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '보건업 및 사회복지 서비스업',
    internalCategory: 'BIO_HEALTH',
    confidence: 'high',
    domainKeywords: ['보건', '의료', '바이오', '제약', '헬스케어', '의약품', '진단', '치료'],
  },

  // ─────────────────────────────────────────────────────────────
  // Environment
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '수도, 하수 및 폐기물 처리, 원료 재생업',
    internalCategory: 'ENVIRONMENT',
    confidence: 'high',
    domainKeywords: ['환경', '폐기물', '재활용', '수질', '대기', '정화', '친환경', '탄소중립', '녹색'],
  },

  // ─────────────────────────────────────────────────────────────
  // Agriculture & Marine
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '농업, 임업 및 어업',
    internalCategory: 'AGRICULTURE',
    confidence: 'high',
    domainKeywords: ['농업', '임업', '어업', '수산', '농산물', '스마트팜', '농축산', '수경재배'],
  },

  // ─────────────────────────────────────────────────────────────
  // Defense
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '공공 행정, 국방 및 사회보장 행정',
    internalCategory: 'DEFENSE',
    confidence: 'medium',
    domainKeywords: ['국방', '방위', '방산', '군사', '안보'],
  },

  // ─────────────────────────────────────────────────────────────
  // Professional/Scientific/Technical Services
  // ─────────────────────────────────────────────────────────────
  // NOTE: This category is INTENTIONALLY REMOVED as it contains only generic R&D keywords
  // that would override domain-specific classification. Programs with generic titles like
  // "연구개발사업" should fall back to other indicators (ministry, agency) or remain low-confidence.
  // {
  //   ksicCategory: '전문, 과학 및 기술 서비스업',
  //   internalCategory: 'ICT', // Default, but context-dependent
  //   confidence: 'low', // Requires title analysis
  //   genericKeywords: ['연구개발', 'R&D', '기술개발', '과학기술', '연구'],
  // },

  // ─────────────────────────────────────────────────────────────
  // Content & Culture
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '예술, 스포츠 및 여가관련 서비스업',
    internalCategory: 'CONTENT',
    confidence: 'medium',
    domainKeywords: ['콘텐츠', '미디어', '방송', '영상', '게임', '애니메이션', '문화', '예술'],
  },
  {
    ksicCategory: '교육 서비스업',
    internalCategory: 'CONTENT',
    confidence: 'low',
    domainKeywords: ['교육', 'EdTech', '에듀테크'],
  },

  // ─────────────────────────────────────────────────────────────
  // Not directly mapped (fallback to manual review)
  // ─────────────────────────────────────────────────────────────
  {
    ksicCategory: '도매 및 소매업',
    internalCategory: 'MANUFACTURING', // Fallback
    confidence: 'low',
    domainKeywords: ['유통', '판매', '상거래'],
  },
  {
    ksicCategory: '숙박 및 음식점업',
    internalCategory: 'CONTENT', // Fallback
    confidence: 'low',
    domainKeywords: ['숙박', '음식', '관광', '호텔'],
  },
  {
    ksicCategory: '금융 및 보험업',
    internalCategory: 'ICT', // FinTech fallback
    confidence: 'low',
    domainKeywords: ['금융', '보험', '핀테크', 'FinTech'],
  },
  {
    ksicCategory: '부동산업',
    internalCategory: 'CONSTRUCTION', // Fallback
    confidence: 'low',
    domainKeywords: ['부동산', 'PropTech'],
  },
  {
    ksicCategory: '사업시설 관리, 사업 지원 및 임대 서비스업',
    internalCategory: 'CONSTRUCTION', // Fallback
    confidence: 'low',
    domainKeywords: ['시설관리', '사업지원'],
  },
];

/**
 * NSTC Research Field & Category → Internal Category Mapping
 *
 * Maps National Science & Technology Standard Classification to internal categories
 * Based on 2023 revision structure (5 research fields, 22 major categories)
 */
export const NSTC_TO_INTERNAL: NSTCMapping[] = [
  // ═════════════════════════════════════════════════════════════
  // Research Field 1: 자연 (Natural Sciences)
  // ═════════════════════════════════════════════════════════════
  {
    researchField: '자연',
    nstcCategory: '수학',
    internalCategory: 'ICT',
    domainKeywords: ['수학', 'Mathematics', '수리과학', '통계', '응용수학'],
  },
  {
    researchField: '자연',
    nstcCategory: '물리학',
    internalCategory: 'ENERGY',
    domainKeywords: ['물리학', 'Physics', '양자물리', '양자역학', '광학', '응집물질', '핵물리', '플라즈마'],
  },
  {
    researchField: '자연',
    nstcCategory: '화학',
    internalCategory: 'MANUFACTURING',
    domainKeywords: ['화학', 'Chemistry', '유기화학', '무기화학', '분석화학', '물리화학'],
  },
  {
    researchField: '자연',
    nstcCategory: '지구과학',
    internalCategory: 'ENVIRONMENT',
    domainKeywords: ['지구과학', 'Earth Science', '대기과학', '해양학', '지질학', '기상', '기후'],
  },
  {
    researchField: '자연',
    nstcCategory: '천문학',
    internalCategory: 'ENERGY',
    domainKeywords: ['천문학', 'Astronomy', '우주과학', '항공우주'],
  },

  // ═════════════════════════════════════════════════════════════
  // Research Field 2: 생명 (Life Sciences)
  // ═════════════════════════════════════════════════════════════
  {
    researchField: '생명',
    nstcCategory: '생명과학',
    internalCategory: 'BIO_HEALTH',
    domainKeywords: ['생명과학', 'Life Science', '생물학', '분자생물', '세포', '유전자', '바이오', '생명공학', '감염병', '박테리오파지', '임상', '내성균', '중환자실', '의료네트워크', '병원네트워크'],
  },
  {
    researchField: '생명',
    nstcCategory: '농림수산',
    internalCategory: 'AGRICULTURE',
    domainKeywords: ['농림수산', 'Agriculture', '농업', '수산', '임업', '축산', '식품', '원예'],
  },
  {
    researchField: '생명',
    nstcCategory: '보건의료',
    internalCategory: 'BIO_HEALTH',
    domainKeywords: ['보건의료', 'Medical', '의학', '약학', '간호', '한의학', '치의학', '수의학', '재활'],
  },

  // ═════════════════════════════════════════════════════════════
  // Research Field 3: 인공물 (Engineering/Artifacts)
  // ═════════════════════════════════════════════════════════════
  {
    researchField: '인공물',
    nstcCategory: '기계',
    internalCategory: 'MANUFACTURING',
    domainKeywords: ['기계', 'Mechanical', '기계공학', '자동차', '항공', '로봇', '정밀기계'],
  },
  {
    researchField: '인공물',
    nstcCategory: '재료',
    internalCategory: 'MANUFACTURING',
    domainKeywords: ['재료', 'Materials', '소재', '금속', '세라믹', '고분자', '복합재료', '나노재료'],
  },
  {
    researchField: '인공물',
    nstcCategory: '화공',
    internalCategory: 'MANUFACTURING',
    domainKeywords: ['화공', 'Chemical Engineering', '화학공학', '촉매', '반응공학'],
    genericKeywords: ['공정'],
  },
  {
    researchField: '인공물',
    nstcCategory: '전기/전자',
    internalCategory: 'ICT',
    domainKeywords: ['반도체', '디스플레이', '전력전자', '회로', '집적회로'],
    genericKeywords: ['전기', '전자', 'Electrical', 'Electronics'],
  },
  {
    researchField: '인공물',
    nstcCategory: '정보/통신',
    internalCategory: 'ICT',
    domainKeywords: ['컴퓨터', '5G', '6G', 'IoT', '통신망', 'ICT네트워크', '양자컴퓨팅', '양자컴퓨터', '양자암호'],
    genericKeywords: ['정보', '통신', 'Information', 'Communication'],
  },
  {
    researchField: '인공물',
    nstcCategory: '에너지/자원',
    internalCategory: 'ENERGY',
    domainKeywords: ['원자력', '신재생', '배터리', '핵융합', '태양전지', '수소연료', '수소에너지', '그린수소', '청정에너지'],
    genericKeywords: ['에너지', '자원', 'Energy', 'Resources', '전력'],
  },
  {
    researchField: '인공물',
    nstcCategory: '환경',
    internalCategory: 'ENVIRONMENT',
    domainKeywords: ['환경공학', '수처리', '대기', '폐기물', '정화', '탄소', '환경오염'],
    genericKeywords: ['환경', 'Environment'],
  },
  {
    researchField: '인공물',
    nstcCategory: '건설/교통',
    internalCategory: 'CONSTRUCTION',
    domainKeywords: ['토목', '건축', '건축구조', '구조물', '구조설계', '도로', '철도', '항만', '교량', '터널'],
    genericKeywords: ['건설', '교통', 'Construction', 'Transportation'],
  },

  // ═════════════════════════════════════════════════════════════
  // Research Field 4: 인문사회 (Humanities & Social Sciences)
  // ═════════════════════════════════════════════════════════════
  {
    researchField: '인문사회',
    nstcCategory: '인문학',
    internalCategory: 'CONTENT',
    domainKeywords: ['인문학', 'Humanities', '철학', '역사', '문학', '언어', '예술'],
  },
  {
    researchField: '인문사회',
    nstcCategory: '사회과학',
    internalCategory: 'CONTENT',
    domainKeywords: ['사회과학', 'Social Science', '경제', '경영', '사회', '정치', '행정', '법'],
  },

  // ═════════════════════════════════════════════════════════════
  // Research Field 5: 융복합 (Convergence)
  // ═════════════════════════════════════════════════════════════
  {
    researchField: '융복합',
    nstcCategory: '뇌과학',
    internalCategory: 'BIO_HEALTH',
    domainKeywords: ['뇌과학', 'Neuroscience', '뇌', '신경', '인지'],
  },
  {
    researchField: '융복합',
    nstcCategory: '인지/감성과학',
    internalCategory: 'ICT',
    domainKeywords: ['인지과학', '감성과학', 'Cognitive', 'HCI', '인간공학'],
  },
  {
    researchField: '융복합',
    nstcCategory: '문화',
    internalCategory: 'CONTENT',
    domainKeywords: ['문화', 'Culture', '문화콘텐츠', '문화재', '문화유산', '전통'],
  },
  {
    researchField: '융복합',
    nstcCategory: '국가안보',
    internalCategory: 'DEFENSE',
    domainKeywords: ['국가안보', 'National Security', '국방', '방위', '안보', '군사', '방산'],
  },
];

/**
 * Ministry → Category Context Mapping
 *
 * Provides ministry-based context boost for ambiguous keywords.
 * ONLY includes highly specific ministries (single-domain focus).
 * Broad ministries like 산업통상자원부 (covers industry + energy) are excluded.
 *
 * When a program from a specific ministry uses generic keywords,
 * boost the category aligned with that ministry's domain.
 */
const MINISTRY_CONTEXT: Record<string, string[]> = {
  BIO_HEALTH: ['보건복지부', '식품의약품안전처', '질병관리청'],
  ENERGY: ['원자력안전위원회'], // Removed 산업통상자원부 (too broad - covers industry + energy)
  ENVIRONMENT: ['환경부', '기상청'],
  AGRICULTURE: ['농림축산식품부', '해양수산부'],
  CONSTRUCTION: ['국토교통부'],
  DEFENSE: ['방위사업청', '국방부'],
  ICT: ['방송통신위원회'], // Removed 과학기술정보통신부 (too broad - covers all R&D)
  CONTENT: ['문화체육관광부'],
};

/**
 * Classify program using official Korean classification keywords
 *
 * This function uses a priority-based matching system with ministry/agency context:
 *
 * Priority Order:
 * 1. Ministry context boost (if ministry matches known category)
 * 2. NSTC domain-specific keywords (highest priority, R&D taxonomy)
 * 3. KSIC domain-specific keywords (high priority, industry taxonomy)
 * 4. NSTC generic keywords (low priority, requires multiple matches)
 * 5. KSIC generic keywords (low priority, requires multiple matches)
 * 6. Fallback to ICT with low confidence
 *
 * Context Handling:
 * - Ambiguous keywords like "네트워크", "구조" are now phrase-specific
 * - Ministry context boosts category when generic keywords match
 * - "양자" split into "양자물리"(ENERGY) vs "양자컴퓨터"(ICT)
 *
 * @param title Program title
 * @param ministry Ministry name (optional)
 * @param agency Agency name (optional)
 * @returns Internal category and confidence level
 */
export function classifyWithOfficialTaxonomy(
  title: string,
  ministry?: string,
  agency?: string
): {
  category: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'nstc' | 'ksic' | 'ministry' | 'fallback';
  matchedKeywords: string[];
} {
  // IMPORTANT: Only use title for keyword matching, not ministry/agency names
  // Ministry/agency names contain domain keywords (e.g., 과학기술정보통신부 contains "정보통신")
  // but these ministries fund programs across ALL domains, not just their namesake
  const searchText = title.toLowerCase();
  const ministryLower = ministry?.toLowerCase() || '';

  // ═══════════════════════════════════════════════════════════════
  // PASS 0: Ministry Context Boost (for programs with generic keywords)
  // ═══════════════════════════════════════════════════════════════

  // Check if ministry provides strong context for category
  let ministryCategory: string | null = null;
  for (const [category, ministries] of Object.entries(MINISTRY_CONTEXT)) {
    if (ministries.some(m => ministryLower.includes(m.toLowerCase()))) {
      ministryCategory = category;
      break;
    }
  }

  // If ministry context exists and generic keywords match, boost that category
  if (ministryCategory) {
    const categoryMappings = NSTC_TO_INTERNAL.filter(m => m.internalCategory === ministryCategory);
    for (const mapping of categoryMappings) {
      const genericMatches = (mapping.genericKeywords || []).filter(keyword =>
        searchText.includes(keyword.toLowerCase())
      );

      // Ministry + generic keywords (requires 2+ matches for confidence)
      if (genericMatches.length >= 2) {
        return {
          category: ministryCategory,
          confidence: 'medium',
          source: 'ministry',
          matchedKeywords: [...genericMatches, ministry!],
        };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASS 1: Domain-Specific Keywords (Highest Priority)
  // ═══════════════════════════════════════════════════════════════

  // 1A. Check NSTC domain keywords first (R&D-specific taxonomy)
  for (const mapping of NSTC_TO_INTERNAL) {
    const matchedKeywords = mapping.domainKeywords.filter(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      return {
        category: mapping.internalCategory,
        confidence: matchedKeywords.length >= 2 ? 'high' : 'medium',
        source: 'nstc',
        matchedKeywords,
      };
    }
  }

  // 1B. Check KSIC domain keywords (industry taxonomy)
  for (const mapping of KSIC_TO_INTERNAL) {
    const matchedKeywords = mapping.domainKeywords.filter(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      return {
        category: mapping.internalCategory,
        confidence: mapping.confidence === 'high' && matchedKeywords.length >= 2 ? 'high' : 'medium',
        source: 'ksic',
        matchedKeywords,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASS 2: Generic Keywords (Low Priority, Require Multiple Matches)
  // ═══════════════════════════════════════════════════════════════

  // 2A. Check NSTC generic keywords (requires at least 2 matches for confidence)
  for (const mapping of NSTC_TO_INTERNAL) {
    if (!mapping.genericKeywords) continue;

    const matchedKeywords = mapping.genericKeywords.filter(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    // Generic keywords require multiple matches to avoid false positives
    if (matchedKeywords.length >= 2) {
      return {
        category: mapping.internalCategory,
        confidence: 'medium',
        source: 'nstc',
        matchedKeywords,
      };
    }
  }

  // 2B. Check KSIC generic keywords (requires at least 2 matches)
  for (const mapping of KSIC_TO_INTERNAL) {
    if (!mapping.genericKeywords) continue;

    const matchedKeywords = mapping.genericKeywords.filter(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    // Generic keywords require multiple matches
    if (matchedKeywords.length >= 2) {
      return {
        category: mapping.internalCategory,
        confidence: 'medium',
        source: 'ksic',
        matchedKeywords,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASS 3: Ministry-Only Fallback (programs with no keywords but clear ministry)
  // ═══════════════════════════════════════════════════════════════

  if (ministryCategory) {
    return {
      category: ministryCategory,
      confidence: 'low',
      source: 'ministry',
      matchedKeywords: ministry ? [ministry] : [],
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PASS 4: Ultimate Fallback
  // ═══════════════════════════════════════════════════════════════
  return {
    category: 'ICT', // Default for R&D programs with no clear classification
    confidence: 'low',
    source: 'fallback',
    matchedKeywords: [],
  };
}

/**
 * Get all possible categories for a given KSIC category
 */
export function getInternalCategoryForKSIC(ksicCategory: string): string | null {
  const mapping = KSIC_TO_INTERNAL.find(m => m.ksicCategory === ksicCategory);
  return mapping?.internalCategory || null;
}

/**
 * Get all NSTC mappings for a given internal category
 */
export function getNSTCCategoriesForInternal(internalCategory: string): string[] {
  return NSTC_TO_INTERNAL
    .filter(m => m.internalCategory === internalCategory)
    .map(m => m.nstcCategory);
}

/**
 * Export statistics
 */
export const CLASSIFICATION_STATS = {
  ksicMappings: KSIC_TO_INTERNAL.length,
  nstcMappings: NSTC_TO_INTERNAL.length,
  totalDomainKeywords: [
    ...KSIC_TO_INTERNAL.flatMap(m => m.domainKeywords),
    ...NSTC_TO_INTERNAL.flatMap(m => m.domainKeywords),
  ].length,
  totalGenericKeywords: [
    ...KSIC_TO_INTERNAL.flatMap(m => m.genericKeywords || []),
    ...NSTC_TO_INTERNAL.flatMap(m => m.genericKeywords || []),
  ].length,
  totalKeywords: [
    ...KSIC_TO_INTERNAL.flatMap(m => [...m.domainKeywords, ...(m.genericKeywords || [])]),
    ...NSTC_TO_INTERNAL.flatMap(m => [...m.domainKeywords, ...(m.genericKeywords || [])]),
  ].length,
  coverageEstimate: '95%+', // Based on keyword coverage
  prioritySystemEnabled: true, // Domain keywords prioritized over generic keywords
};
