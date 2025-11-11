/**
 * Korean Industry & Technology Taxonomy
 *
 * Hierarchical classification system for Korean R&D ecosystem with:
 * - Industry sectors and sub-sectors
 * - Technology domains and keywords
 * - Cross-industry relevance mapping
 * - Korean keyword normalization
 */

/**
 * Industry taxonomy with hierarchical structure
 */
export const INDUSTRY_TAXONOMY = {
  ICT: {
    name: 'ICT/정보통신',
    keywords: ['ICT', '정보통신', 'IT', '정보기술'],
    subSectors: {
      AI: {
        name: '인공지능',
        keywords: ['AI', '인공지능', '머신러닝', '딥러닝', '기계학습', 'ML', 'DL', '자연어처리', 'NLP', '컴퓨터비전'],
      },
      SOFTWARE: {
        name: '소프트웨어',
        keywords: ['소프트웨어', 'SW', '앱', '애플리케이션', '클라우드', '플랫폼', 'SaaS', 'PaaS'],
      },
      DATA: {
        name: '데이터/빅데이터',
        keywords: ['데이터', '빅데이터', '데이터분석', '데이터사이언스', 'DB', '데이터베이스'],
      },
      NETWORK: {
        name: '네트워크/통신',
        keywords: ['네트워크', '통신', '5G', '6G', '무선통신', '이동통신', '광통신'],
      },
      SECURITY: {
        name: '정보보안',
        keywords: ['보안', '정보보안', '사이버보안', '암호', '인증', '블록체인'],
      },
      IOT: {
        name: 'IoT/스마트시티',
        keywords: ['IoT', '사물인터넷', '스마트시티', '스마트홈', '센서', '엣지컴퓨팅'],
      },
    },
  },

  MANUFACTURING: {
    name: '제조업',
    keywords: ['제조', '제조업', '생산', '공정'],
    subSectors: {
      SMART_FACTORY: {
        name: '스마트공장',
        keywords: ['스마트공장', '스마트제조', '디지털제조', '자동화', 'MES', 'ERP'],
      },
      ROBOTICS: {
        name: '로봇/자동화',
        keywords: ['로봇', '로봇공학', '자동화', '협동로봇', '코봇', '산업로봇'],
      },
      MATERIALS: {
        name: '소재/부품',
        keywords: ['소재', '신소재', '부품', '부품소재', '나노', '복합소재'],
      },
      ELECTRONICS: {
        name: '전자/반도체',
        keywords: ['전자', '반도체', '디스플레이', '전자부품', '센서', 'PCB'],
      },
      MACHINERY: {
        name: '기계',
        keywords: ['기계', '기계공학', '정밀기계', '공작기계', '설비'],
      },
    },
  },

  BIO_HEALTH: {
    name: '바이오/헬스',
    keywords: ['바이오', '헬스', '의료', '생명공학', 'BIO'],
    subSectors: {
      MEDICAL_DEVICE: {
        name: '의료기기',
        keywords: ['의료기기', '의료장비', '진단기기', '치료기기', '헬스케어'],
      },
      PHARMA: {
        name: '의약/제약',
        keywords: ['의약', '제약', '신약', '바이오의약', '의약품'],
      },
      BIOTECH: {
        name: '생명공학',
        keywords: ['생명공학', '바이오기술', '유전공학', '세포치료', '줄기세포'],
      },
      DIGITAL_HEALTH: {
        name: '디지털헬스',
        keywords: ['디지털헬스', '원격의료', 'u헬스', '모바일헬스', 'mHealth'],
      },
    },
  },

  ENERGY: {
    name: '에너지',
    keywords: ['에너지', '전력', '발전'],
    subSectors: {
      RENEWABLE: {
        name: '신재생에너지',
        keywords: ['신재생', '태양광', '풍력', '수소', '연료전지', 'ESS', '에너지저장'],
      },
      ELECTRIC_VEHICLE: {
        name: '전기차/배터리',
        keywords: ['전기차', 'EV', '배터리', '이차전지', '전지', 'BMS'],
      },
      SMART_GRID: {
        name: '스마트그리드',
        keywords: ['스마트그리드', '전력망', 'AMI', '마이크로그리드'],
      },
    },
  },

  ENVIRONMENT: {
    name: '환경',
    keywords: ['환경', '친환경', '그린'],
    subSectors: {
      CARBON_NEUTRAL: {
        name: '탄소중립',
        keywords: ['탄소중립', '탄소저감', 'CCUS', '탄소포집', '저탄소'],
      },
      WASTE: {
        name: '폐기물/자원순환',
        keywords: ['폐기물', '자원순환', '재활용', '업사이클', '순환경제'],
      },
      WATER: {
        name: '수처리/물환경',
        keywords: ['수처리', '정수', '하수', '물환경', '수질'],
      },
    },
  },

  AGRICULTURE: {
    name: '농업/식품',
    keywords: ['농업', '농림', '식품', '푸드테크'],
    subSectors: {
      SMART_FARM: {
        name: '스마트팜',
        keywords: ['스마트팜', '스마트농업', '식물공장', '정밀농업'],
      },
      FOOD_TECH: {
        name: '푸드테크',
        keywords: ['푸드테크', '대체식품', '식품가공', '농식품'],
      },
    },
  },

  MARINE: {
    name: '해양수산',
    keywords: ['해양', '수산', '해양수산'],
    subSectors: {
      AQUACULTURE: {
        name: '양식/수산',
        keywords: ['양식', '수산', '스마트양식', '해양바이오'],
      },
      MARITIME: {
        name: '조선/해양플랜트',
        keywords: ['조선', '선박', '해양플랜트', '해운', '항만'],
      },
      MARINE_RESOURCE: {
        name: '해양자원',
        keywords: ['해양자원', '해양광물', '해양에너지', '해수담수화'],
      },
    },
  },

  CONSTRUCTION: {
    name: '건설',
    keywords: ['건설', '건축', '토목'],
    subSectors: {
      SMART_CONSTRUCTION: {
        name: '스마트건설',
        keywords: ['스마트건설', 'BIM', '건설자동화', '모듈러'],
      },
      INFRASTRUCTURE: {
        name: '인프라/시설물',
        keywords: ['인프라', '시설물', '도로', '교량', '터널'],
      },
    },
  },

  TRANSPORTATION: {
    name: '교통/운송',
    keywords: ['교통', '운송', '모빌리티'],
    subSectors: {
      AUTONOMOUS: {
        name: '자율주행',
        keywords: ['자율주행', '자율차', 'AV', 'ADAS', '커넥티드카'],
      },
      MOBILITY: {
        name: '모빌리티',
        keywords: ['모빌리티', '마이크로모빌리티', 'MaaS', '공유모빌리티'],
      },
      AVIATION: {
        name: '항공우주',
        keywords: ['항공', '우주', '드론', 'UAM', '위성'],
      },
    },
  },

  DEFENSE: {
    name: '방위/국방',
    keywords: ['방위', '국방', '방산', '군사', '안보', '국방산업', 'DEFENSE'],
    subSectors: {
      WEAPON_SYSTEM: {
        name: '무기체계',
        keywords: ['무기체계', '전투체계', '군수', '병기', '전력증강'],
      },
      DEFENSE_TECH: {
        name: '국방과학기술',
        keywords: ['국방과학기술', '국방R&D', '방위산업기술', '국방기술'],
      },
      MILITARY_ICT: {
        name: '군사정보통신',
        keywords: ['군사통신', '군용전자', '지휘통제', 'C4I', '전술통신'],
      },
    },
  },
} as const;

/**
 * Technology keywords for cross-domain matching
 */
export const TECHNOLOGY_KEYWORDS = {
  // Core technologies
  DIGITAL_TRANSFORMATION: ['디지털전환', 'DX', '디지털혁신', '디지털화'],
  INTELLIGENT_SYSTEMS: ['지능형', 'AI기반', 'AI활용', '인텔리전트'],
  AUTOMATION: ['자동화', '무인화', '스마트', '지능화'],

  // Research stages
  BASIC_RESEARCH: ['기초연구', '원천기술', '핵심기술'],
  APPLIED_RESEARCH: ['응용연구', '실용화', '상용화'],
  COMMERCIALIZATION: ['사업화', '제품화', '양산', '시장진입'],

  // Innovation types
  INNOVATION: ['혁신', '창업', '신기술', '첨단'],
  CONVERGENCE: ['융합', '복합', '연계', '통합'],
  COLLABORATION: ['협력', '공동', '컨소시엄', '산학협력'],
} as const;

/**
 * Cross-industry relevance matrix (0.0-1.0 scores)
 * Higher scores indicate stronger relevance between industries
 */
export const INDUSTRY_RELEVANCE: Record<string, Record<string, number>> = {
  ICT: {
    ICT: 1.0,
    MANUFACTURING: 0.8, // Smart factory, automation
    BIO_HEALTH: 0.7, // Digital health
    ENERGY: 0.7, // Smart grid
    ENVIRONMENT: 0.6,
    AGRICULTURE: 0.7, // Smart farm
    MARINE: 0.6,
    CONSTRUCTION: 0.6, // Smart construction
    TRANSPORTATION: 0.8, // Autonomous vehicles
    DEFENSE: 0.2, // Military ICT (low relevance for most ICT companies)
  },
  MANUFACTURING: {
    ICT: 0.8,
    MANUFACTURING: 1.0,
    BIO_HEALTH: 0.5,
    ENERGY: 0.6, // Battery manufacturing
    ENVIRONMENT: 0.5,
    AGRICULTURE: 0.5,
    MARINE: 0.6, // Shipbuilding
    CONSTRUCTION: 0.6,
    TRANSPORTATION: 0.7, // Automotive
    DEFENSE: 0.4, // Defense manufacturing (specialized, low general relevance)
  },
  BIO_HEALTH: {
    ICT: 0.7,
    MANUFACTURING: 0.5,
    BIO_HEALTH: 1.0,
    ENERGY: 0.3,
    ENVIRONMENT: 0.5,
    AGRICULTURE: 0.6, // Food tech
    MARINE: 0.5, // Marine bio
    CONSTRUCTION: 0.3,
    TRANSPORTATION: 0.4,
    DEFENSE: 0.1, // Military medicine only (very low general relevance)
  },
  ENERGY: {
    ICT: 0.7,
    MANUFACTURING: 0.6,
    BIO_HEALTH: 0.3,
    ENERGY: 1.0,
    ENVIRONMENT: 0.8, // Carbon neutral
    AGRICULTURE: 0.4,
    MARINE: 0.5, // Marine energy
    CONSTRUCTION: 0.5,
    TRANSPORTATION: 0.7, // EV
    DEFENSE: 0.1, // Military energy systems (very low general relevance)
  },
  ENVIRONMENT: {
    ICT: 0.6,
    MANUFACTURING: 0.5,
    BIO_HEALTH: 0.5,
    ENERGY: 0.8,
    ENVIRONMENT: 1.0,
    AGRICULTURE: 0.6,
    MARINE: 0.6,
    CONSTRUCTION: 0.6,
    TRANSPORTATION: 0.6,
    DEFENSE: 0.0, // No relevance
  },
  AGRICULTURE: {
    ICT: 0.7,
    MANUFACTURING: 0.5,
    BIO_HEALTH: 0.6,
    ENERGY: 0.4,
    ENVIRONMENT: 0.6,
    AGRICULTURE: 1.0,
    MARINE: 0.5,
    CONSTRUCTION: 0.3,
    TRANSPORTATION: 0.3,
    DEFENSE: 0.0, // No relevance
  },
  MARINE: {
    ICT: 0.6,
    MANUFACTURING: 0.6,
    BIO_HEALTH: 0.5,
    ENERGY: 0.5,
    ENVIRONMENT: 0.6,
    AGRICULTURE: 0.5,
    MARINE: 1.0,
    CONSTRUCTION: 0.4,
    TRANSPORTATION: 0.5,
    DEFENSE: 0.3, // Naval systems (specialized, low general relevance)
  },
  CONSTRUCTION: {
    ICT: 0.6,
    MANUFACTURING: 0.6,
    BIO_HEALTH: 0.3,
    ENERGY: 0.5,
    ENVIRONMENT: 0.6,
    AGRICULTURE: 0.3,
    MARINE: 0.4,
    CONSTRUCTION: 1.0,
    TRANSPORTATION: 0.5,
    DEFENSE: 0.2, // Military facilities (specialized, low general relevance)
  },
  TRANSPORTATION: {
    ICT: 0.8,
    MANUFACTURING: 0.7,
    BIO_HEALTH: 0.4,
    ENERGY: 0.7,
    ENVIRONMENT: 0.6,
    AGRICULTURE: 0.3,
    MARINE: 0.5,
    CONSTRUCTION: 0.5,
    TRANSPORTATION: 1.0,
    DEFENSE: 0.3, // Military vehicles (specialized, low general relevance)
  },

  DEFENSE: {
    ICT: 0.2,
    MANUFACTURING: 0.4,
    BIO_HEALTH: 0.1,
    ENERGY: 0.1,
    ENVIRONMENT: 0.0,
    AGRICULTURE: 0.0,
    MARINE: 0.3,
    CONSTRUCTION: 0.2,
    TRANSPORTATION: 0.3,
    DEFENSE: 1.0,
  },
};

/**
 * Normalize Korean keywords (remove spaces, convert to uppercase)
 */
export function normalizeKoreanKeyword(keyword: string): string {
  return keyword
    .replace(/\s+/g, '') // Remove all spaces
    .toUpperCase()
    .trim();
}

/**
 * Find industry sector from keyword
 */
export function findIndustrySector(keyword: string): string | null {
  const normalized = normalizeKoreanKeyword(keyword);

  for (const [sectorKey, sector] of Object.entries(INDUSTRY_TAXONOMY)) {
    // Check main sector keywords
    const mainKeywords = sector.keywords.map(k => normalizeKoreanKeyword(k));
    if (mainKeywords.some(k => normalized.includes(k) || k.includes(normalized))) {
      return sectorKey;
    }

    // Check sub-sector keywords
    for (const subSector of Object.values(sector.subSectors)) {
      const subKeywords = subSector.keywords.map((k: string) => normalizeKoreanKeyword(k));
      if (subKeywords.some((k: string) => normalized.includes(k) || k.includes(normalized))) {
        return sectorKey;
      }
    }
  }

  return null;
}

/**
 * Find sub-sector from keyword
 */
export function findSubSector(
  keyword: string
): { sector: string; subSector: string } | null {
  const normalized = normalizeKoreanKeyword(keyword);

  for (const [sectorKey, sector] of Object.entries(INDUSTRY_TAXONOMY)) {
    for (const [subSectorKey, subSector] of Object.entries(sector.subSectors)) {
      const subKeywords = subSector.keywords.map((k: string) => normalizeKoreanKeyword(k));
      if (subKeywords.some((k: string) => normalized.includes(k) || k.includes(normalized))) {
        return { sector: sectorKey, subSector: subSectorKey };
      }
    }
  }

  return null;
}

/**
 * Calculate industry relevance score between two sectors
 */
export function calculateIndustryRelevance(sector1: string, sector2: string): number {
  if (sector1 === sector2) return 1.0;

  const relevance = INDUSTRY_RELEVANCE[sector1]?.[sector2];
  if (relevance !== undefined) return relevance;

  // Default low relevance if not in matrix
  return 0.3;
}

/**
 * Get all keywords for an industry sector (including sub-sectors)
 */
export function getAllKeywordsForSector(sectorKey: string): string[] {
  const sector = INDUSTRY_TAXONOMY[sectorKey as keyof typeof INDUSTRY_TAXONOMY];
  if (!sector) return [];

  const keywords: string[] = [...sector.keywords];

  for (const subSector of Object.values(sector.subSectors)) {
    keywords.push(...subSector.keywords);
  }

  return keywords;
}

/**
 * Match keyword against technology domains
 */
export function matchTechnologyKeyword(keyword: string): string[] {
  const normalized = normalizeKoreanKeyword(keyword);
  const matches: string[] = [];

  for (const [domain, keywords] of Object.entries(TECHNOLOGY_KEYWORDS)) {
    const domainKeywords = keywords.map(k => normalizeKoreanKeyword(k));
    if (domainKeywords.some(k => normalized.includes(k) || k.includes(normalized))) {
      matches.push(domain);
    }
  }

  return matches;
}
