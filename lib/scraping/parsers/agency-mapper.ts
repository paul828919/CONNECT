/**
 * Agency-to-Category Mapper (Hierarchical Version)
 *
 * Maps Korean government R&D agencies to industry sectors using hierarchical categorization:
 * Ministry (domain) → Agency (specialization) → Program
 *
 * Data sources:
 * - NTIS Agency Scraping Configuration (docs/current/NTIS_Agency_Scraping_Config.md)
 * - Manual agency research (14 agencies, October 24, 2025)
 * - Official agency business introduction pages
 * - Official Korean taxonomy (KSIC + NSTC) - integrated Jan 13, 2025
 *
 * Strategy (Updated Jan 13, 2025):
 * 1. Primary: Use official taxonomy classifier (KSIC + NSTC, 500+ keywords)
 * 2. Validation: Cross-check with ministry/agency mappings
 * 3. Fallback (bidirectional with context):
 *    - If ministry NULL: Use agency + provide domain context
 *    - If agency NULL: Use ministry + provide focus area context
 * 4. Manual review: Flag programs with low confidence or conflicting classifications
 * 5. Goal: 0% omission (not 95% or 98%)
 *
 * Last updated: 2025-01-13
 */

import { classifyWithOfficialTaxonomy } from './official-category-mapper';

export interface MinistryMapping {
  /** Full Korean name of the ministry */
  koreanName: string;
  /** Alternative names (abbreviations) */
  aliases: string[];
  /** Primary domain/sector */
  primarySector: string;
  /** Default keywords for this ministry's domain */
  defaultKeywords: string[];
  /** English name */
  englishName: string;
}

export interface AgencyMapping {
  /** Full Korean name of the agency */
  koreanName: string;
  /** Alternative Korean names (abbreviations, old names) */
  aliases: string[];
  /** Industry sector classification */
  industrySector: string;
  /** Default keywords for this agency's focus area */
  defaultKeywords: string[];
  /** Confidence level for this mapping */
  confidence: 'high' | 'medium' | 'low';
  /** Notes about the agency's focus */
  focusArea: string;
  /** Parent ministry (if applicable) */
  parentMinistry?: string;
}

export interface CategorizationResult {
  /** Resolved industry category */
  category: string | null;
  /** Combined keywords from ministry + agency */
  keywords: string[];
  /** Data source used (ministry, agency, or both) */
  source: 'ministry' | 'agency' | 'both' | 'fallback' | 'manual_review';
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low' | 'none';
  /** Whether this program requires manual review */
  requiresManualReview: boolean;
  /** Context for fallback categorization */
  context?: string;
}

/**
 * Ministry-to-Sector Mapping Table
 *
 * Maps Korean government ministries to primary industry domains.
 * Used for hierarchical categorization and fallback when agency is unknown.
 */
export const MINISTRY_MAPPINGS: Record<string, MinistryMapping> = {
  MSIT: {
    koreanName: '과학기술정보통신부',
    aliases: ['과기정통부', 'MSIT', '과기부'],
    primarySector: 'ICT',
    defaultKeywords: ['ICT', '정보통신', '과학기술', 'AI', '소프트웨어', '디지털'],
    englishName: 'Ministry of Science and ICT',
  },
  MOTIE: {
    koreanName: '산업통상자원부',
    aliases: ['산자부', 'MOTIE', '산업부'],
    primarySector: 'MANUFACTURING',
    defaultKeywords: ['산업기술', '제조', '에너지', '통상', '자원', '산업혁신'],
    englishName: 'Ministry of Trade, Industry and Energy',
  },
  MOHW: {
    koreanName: '보건복지부',
    aliases: ['복지부', 'MOHW', '보건복지부'],
    primarySector: 'BIO_HEALTH',
    defaultKeywords: ['보건', '의료', '바이오', '복지', '헬스케어', '제약'],
    englishName: 'Ministry of Health and Welfare',
  },
  ME: {
    koreanName: '환경부',
    aliases: ['ME', '환경부'],
    primarySector: 'ENVIRONMENT',
    defaultKeywords: ['환경', '친환경', '기후', '탄소중립', '녹색', '순환경제'],
    englishName: 'Ministry of Environment',
  },
  MAFRA: {
    koreanName: '농림축산식품부',
    aliases: ['농식품부', 'MAFRA', '농림부'],
    primarySector: 'AGRICULTURE',
    defaultKeywords: ['농업', '축산', '식품', '스마트팜', '농림', '푸드테크'],
    englishName: 'Ministry of Agriculture, Food and Rural Affairs',
  },
  MOLIT: {
    koreanName: '국토교통부',
    aliases: ['국토부', 'MOLIT', '국토교통부'],
    primarySector: 'CONSTRUCTION',
    defaultKeywords: ['건설', '교통', '국토', '인프라', '스마트시티', '도시'],
    englishName: 'Ministry of Land, Infrastructure and Transport',
  },
  MOF: {
    koreanName: '해양수산부',
    aliases: ['해수부', 'MOF', '해양부'],
    primarySector: 'MARINE',
    defaultKeywords: ['해양', '수산', '해운', '양식', '조선', '항만'],
    englishName: 'Ministry of Oceans and Fisheries',
  },
  DAPA: {
    koreanName: '방위사업청',
    aliases: ['방사청', 'DAPA'],
    primarySector: 'DEFENSE',
    defaultKeywords: ['국방', '방위', '방산', '군사', '안보', '무기체계'],
    englishName: 'Defense Acquisition Program Administration',
  },
  MSS: {
    koreanName: '중소벤처기업부',
    aliases: ['중기부', 'MSS', '중소기업부'],
    primarySector: 'MANUFACTURING',
    defaultKeywords: ['중소기업', '벤처', '스타트업', '창업', '기업지원', '혁신'],
    englishName: 'Ministry of SMEs and Startups',
  },
  MCST: {
    koreanName: '문화체육관광부',
    aliases: ['문체부', 'MCST', '문화부'],
    primarySector: 'CONTENT',
    defaultKeywords: ['문화', '콘텐츠', '관광', '체육', '미디어', '문화산업'],
    englishName: 'Ministry of Culture, Sports and Tourism',
  },
  MOE: {
    koreanName: '교육부',
    aliases: ['MOE', '교육부'],
    primarySector: 'ICT',
    defaultKeywords: ['교육', '인재양성', '연구', '학술', '대학', '기초연구'],
    englishName: 'Ministry of Education',
  },
  NSSC: {
    koreanName: '원자력안전위원회',
    aliases: ['원안위', 'NSSC', '원자력안전위'],
    primarySector: 'ENERGY',
    defaultKeywords: ['원자력안전', '원자력규제', '방사선안전', '원전안전', 'SMR', '소형모듈원자로'],
    englishName: 'Nuclear Safety and Security Commission',
  },
  CHA: {
    koreanName: '국가유산청',
    aliases: ['문화재청', 'CHA', '유산청'],
    primarySector: 'CONSTRUCTION',
    defaultKeywords: ['문화유산', '문화재보존', '유산관리', '복원', '전통문화'],
    englishName: 'Cultural Heritage Administration',
  },
  KMA: {
    koreanName: '기상청',
    aliases: ['KMA', '기상청'],
    primarySector: 'ENVIRONMENT',
    defaultKeywords: ['기상', '기후', '날씨예보', '위성관측', '기상재해'],
    englishName: 'Korea Meteorological Administration',
  },
  KNPA: {
    koreanName: '경찰청',
    aliases: ['KNPA', '경찰청'],
    primarySector: 'ICT',
    defaultKeywords: ['과학치안', '치안기술', '범죄예방', '공공안전', '스마트치안'],
    englishName: 'Korean National Police Agency',
  },
  NFA: {
    koreanName: '소방청',
    aliases: ['NFA', '소방청'],
    primarySector: 'ENERGY',
    defaultKeywords: ['소방안전', '재난대응', '화재안전', '배터리안전', '안전기술'],
    englishName: 'National Fire Agency',
  },
  MOEL: {
    koreanName: '고용노동부',
    aliases: ['고용부', 'MOEL', '노동부'],
    primarySector: 'BIO_HEALTH',
    defaultKeywords: ['고용', '노동', '직업재활', '보조공학', '산업안전'],
    englishName: 'Ministry of Employment and Labor',
  },
  MOIS: {
    koreanName: '행정안전부',
    aliases: ['행안부', 'MOIS', '행정부'],
    primarySector: 'CONSTRUCTION',
    defaultKeywords: ['재난안전', '지진', '방재', '안전인프라', '긴급대응', '국민안전'],
    englishName: 'Ministry of the Interior and Safety',
  },
  KDCA_MINISTRY: {
    koreanName: '질병관리청',
    aliases: ['질병관리본부', 'KDCA', 'KCDC'],
    primarySector: 'BIO_HEALTH',
    defaultKeywords: ['질병', '방역', '보건', '의료', '감염병', '공중보건', '백신'],
    englishName: 'Korea Disease Control and Prevention Agency',
  },
  OTHER: {
    koreanName: '기타',
    aliases: ['기타', 'Other', 'ETC'],
    primarySector: 'ENERGY',
    defaultKeywords: ['에너지', '기술개발', 'R&D', '연구'],
    englishName: 'Other/Miscellaneous',
  },
};

/**
 * Comprehensive agency-to-sector mapping table
 *
 * Based on official Korean government agency mandates and focus areas.
 * Includes manual research data from 14 specialized agencies (October 24, 2025).
 * Last updated: 2025-10-24
 */
export const AGENCY_MAPPINGS: Record<string, AgencyMapping> = {
  // ============================================================================
  // Cross-Domain / Multi-Ministry Agencies
  // ============================================================================

  NRF: {
    koreanName: '한국연구재단',
    aliases: ['NRF', '연구재단'],
    industrySector: 'ICT', // Default to ICT, but requires ministry context
    defaultKeywords: ['기초연구', '기술개발', '학술연구', '인력양성', '국제협력', 'R&D'],
    confidence: 'medium', // Requires ministry context for high confidence
    focusArea: 'Basic Research / Cross-Domain',
    parentMinistry: '과기정통부/교육부', // Serves multiple ministries
  },

  KISTEP: {
    koreanName: '한국과학기술기획평가원',
    aliases: ['KISTEP', '과기기평원', '과학기술기획평가원'],
    industrySector: 'ICT',
    defaultKeywords: ['과학기술정책', '미래예측', '예비타당성조사', '연구개발', '정책브리프', 'R&D기획'],
    confidence: 'high',
    focusArea: 'S&T Policy Planning/Evaluation',
    parentMinistry: '과학기술정보통신부',
  },

  COMPA: {
    koreanName: '과학기술사업화진흥원',
    aliases: ['COMPA', '사업화진흥원'],
    industrySector: 'ICT',
    defaultKeywords: ['기술사업화', '기술이전', '사업화지원', '기술금융', '창업지원'],
    confidence: 'high',
    focusArea: 'Technology Commercialization',
    parentMinistry: '과학기술정보통신부',
  },

  NST: {
    koreanName: '국가과학기술연구회',
    aliases: ['NST', '국과연'],
    industrySector: 'ICT',
    defaultKeywords: ['출연연', '정부출연연구기관', '융합연구', '과학기술', '연구협력'],
    confidence: 'high',
    focusArea: 'Government Research Institutes',
    parentMinistry: '과학기술정보통신부',
  },

  INNOPOLIS: {
    koreanName: '연구개발특구진흥재단',
    aliases: ['Innopolis', '특구재단', '연구개발특구재단'],
    industrySector: 'ICT',
    defaultKeywords: ['연구개발특구', '기술사업화', '창업지원', '기술혁신', '산학협력'],
    confidence: 'high',
    focusArea: 'R&D Special Zone',
    parentMinistry: '과학기술정보통신부',
  },

  // ============================================================================
  // ICT & Software
  // ============================================================================

  IITP: {
    koreanName: '정보통신기획평가원',
    aliases: ['IITP', '정보통신평가원'],
    industrySector: 'ICT',
    defaultKeywords: ['ICT', '정보통신', 'SW', '소프트웨어', 'AI', '인공지능', '5G', '6G', '클라우드'],
    confidence: 'high',
    focusArea: 'ICT/Software R&D',
    parentMinistry: '과학기술정보통신부',
  },

  KISA: {
    koreanName: '한국인터넷진흥원',
    aliases: ['KISA', '인터넷진흥원'],
    industrySector: 'ICT',
    defaultKeywords: ['사이버보안', '정보보호', '인터넷', '디지털', '보안기술'],
    confidence: 'high',
    focusArea: 'Internet Security',
    parentMinistry: '과학기술정보통신부',
  },

  ETRI: {
    koreanName: '한국전자통신연구원',
    aliases: ['ETRI'],
    industrySector: 'ICT',
    defaultKeywords: ['전자', '통신', 'ICT', '반도체', 'AI', '6G'],
    confidence: 'high',
    focusArea: 'Electronics/Telecom Research',
    parentMinistry: '과학기술정보통신부',
  },

  KASA: {
    koreanName: '우주항공청',
    aliases: ['KASA', '항공우주청', '우주청'],
    industrySector: 'ICT',
    defaultKeywords: ['우주', '항공', '위성', '발사체', '우주탐사', '항공우주기술'],
    confidence: 'high',
    focusArea: 'Aerospace/Space',
    parentMinistry: '과학기술정보통신부',
  },

  // ============================================================================
  // Manufacturing & Industrial Technology
  // ============================================================================

  KEIT: {
    koreanName: '한국산업기술평가관리원',
    aliases: ['산업기술평가원', 'KEIT'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['산업기술개발', '반도체', '탄소중립', '로봇', '바이오헬스', '제조혁신', '소재부품장비'],
    confidence: 'high',
    focusArea: 'Industrial Technology R&D',
    parentMinistry: '산업통상자원부',
  },

  KIAT: {
    koreanName: '한국산업기술진흥원',
    aliases: ['KIAT', '산기진흥원'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['산업기술혁신', '기술정책', '전략산업', '글로벌혁신생태계', 'ESG경영', '산업R&D'],
    confidence: 'high',
    focusArea: 'Industrial Innovation/Policy',
    parentMinistry: '산업통상자원부',
  },

  TIPA: {
    koreanName: '중소기업기술정보진흥원',
    aliases: ['TIPA', '중진원', '중소기업진흥원'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['R&D지원', '스마트공장', '기술혁신', '중소벤처기업', '디지털화', '중소기업지원'],
    confidence: 'high',
    focusArea: 'SME Technology Innovation',
    parentMinistry: '중소벤처기업부',
  },

  KOITA: {
    koreanName: '한국산업기술시험원',
    aliases: ['KOITA', '산기시', '산업기술시험원'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['시험평가', '인증', '품질', '산업기술', '신뢰성'],
    confidence: 'high',
    focusArea: 'Industrial Testing/Certification',
    parentMinistry: '산업통상자원부',
  },

  // ============================================================================
  // Energy Technology
  // ============================================================================

  KETEP: {
    koreanName: '한국에너지기술평가원',
    aliases: ['에너지기술평가원', 'KETEP'],
    industrySector: 'ENERGY',
    defaultKeywords: ['에너지기술개발', '신재생에너지', '수소기술', '원자력', '실증단지', '전력', '발전'],
    confidence: 'high',
    focusArea: 'Energy Technology R&D',
    parentMinistry: '산업통상자원부',
  },

  KAERI: {
    koreanName: '한국원자력연구원',
    aliases: ['KAERI', '원자력연구원'],
    industrySector: 'ENERGY',
    defaultKeywords: ['원자력', '원자로', '핵융합', '방사선', '원자력안전'],
    confidence: 'high',
    focusArea: 'Nuclear Energy Research',
    parentMinistry: '과학기술정보통신부',
  },

  KINS: {
    koreanName: '한국원자력안전기술원',
    aliases: ['KINS', '원안기술원'],
    industrySector: 'ENERGY',
    defaultKeywords: ['원자력안전', '안전규제', '방사선안전', '원전안전'],
    confidence: 'high',
    focusArea: 'Nuclear Safety',
    parentMinistry: '원자력안전위원회',
  },

  SMR_RESEARCH: {
    koreanName: '소형모듈원자로규제연구추진단',
    aliases: ['SMR규제연구추진단', 'SMR추진단'],
    industrySector: 'ENERGY',
    defaultKeywords: ['원자력', '원전', 'SMR', '소형모듈원자로', '원자력규제', '안전규제'],
    confidence: 'high',
    focusArea: 'SMR Regulatory Research',
    parentMinistry: '원자력안전위원회',
  },

  KNSF: {
    koreanName: '한국원자력안전재단',
    aliases: ['원자력안전재단', 'KNSF'],
    industrySector: 'ENERGY',
    defaultKeywords: ['원자력', '원전', '원자력안전', '안전문화', '방사선안전'],
    confidence: 'high',
    focusArea: 'Nuclear Safety Foundation',
    parentMinistry: '원자력안전위원회',
  },

  // ============================================================================
  // Healthcare & Biotech
  // ============================================================================

  KHIDI: {
    koreanName: '한국보건산업진흥원',
    aliases: ['보건산업진흥원', 'KHIDI'],
    industrySector: 'BIO_HEALTH',
    defaultKeywords: ['바이오헬스', '의료', '바이오', '헬스케어', '제약', '의료기기', '보건산업', '기술사업화'],
    confidence: 'high',
    focusArea: 'Healthcare/Biotech Industry',
    parentMinistry: '보건복지부',
  },

  KDCA: {
    koreanName: '질병관리청',
    aliases: ['질병관리본부', 'KDCA', 'KCDC'],
    industrySector: 'BIO_HEALTH',
    defaultKeywords: ['질병', '방역', '보건', '의료', '감염병', '공중보건', '백신'],
    confidence: 'high',
    focusArea: 'Disease Control/Public Health',
    parentMinistry: '보건복지부',
  },

  MFDS: {
    koreanName: '식품의약품안전처',
    aliases: ['식약처', 'MFDS'],
    industrySector: 'BIO_HEALTH',
    defaultKeywords: ['식품안전', '의약품', '규제', '안전', '식약품', '의료기기인허가'],
    confidence: 'high',
    focusArea: 'Food/Drug Safety',
    parentMinistry: '식품의약품안전처',
  },

  KBRI: {
    koreanName: '한국뇌연구원',
    aliases: ['KBRI', '뇌연구원'],
    industrySector: 'BIO_HEALTH',
    defaultKeywords: ['뇌과학', '신경과학', '뇌질환', '뇌연구', '인지'],
    confidence: 'high',
    focusArea: 'Brain Research',
    parentMinistry: '과학기술정보통신부',
  },

  KRIBB: {
    koreanName: '한국생명공학연구원',
    aliases: ['KRIBB', '생명연'],
    industrySector: 'BIO_HEALTH',
    defaultKeywords: ['생명공학', '바이오', '생명과학', '유전자', '단백질'],
    confidence: 'high',
    focusArea: 'Biotechnology Research',
    parentMinistry: '과학기술정보통신부',
  },

  KDDF: {
    koreanName: '범부처방역연계감염병연구개발재단',
    aliases: ['KDDF', '감염병재단', '방역재단'],
    industrySector: 'BIO_HEALTH',
    defaultKeywords: ['감염병', '방역', 'R&D', '백신', '치료제', '진단기술'],
    confidence: 'high',
    focusArea: 'Infectious Disease R&D',
    parentMinistry: '보건복지부',
  },

  NIFDS: {
    koreanName: '식품의약품안전평가원',
    aliases: ['NIFDS', '식약평가원', '식품의약품평가원'],
    industrySector: 'BIO_HEALTH',
    defaultKeywords: ['식품안전', '의약품안전', '식약처', '안전성평가', '독성평가', '규제과학'],
    confidence: 'high',
    focusArea: 'Food/Drug Safety Evaluation',
    parentMinistry: '식품의약품안전처',
  },

  // ============================================================================
  // Environment & Green Tech
  // ============================================================================

  KEITI: {
    koreanName: '한국환경산업기술원',
    aliases: ['환경산업기술원', 'KEITI', '환경기술원'],
    industrySector: 'ENVIRONMENT',
    defaultKeywords: ['환경기술개발', '녹색산업', '순환경제', 'ESG경영', '친환경제품', '친환경', '그린기술', '탄소중립'],
    confidence: 'high',
    focusArea: 'Green Technology',
    parentMinistry: '환경부',
  },

  KMITI: {
    koreanName: '한국기상산업기술원',
    aliases: ['기상산업기술원', 'KMITI'],
    industrySector: 'ENVIRONMENT',
    defaultKeywords: ['기상예보', '위험기상', '기후변화', '항공기상', '관측장비', '기상', '날씨', '기후'],
    confidence: 'high',
    focusArea: 'Weather Technology',
    parentMinistry: '기상청',
  },

  KIGAM: {
    koreanName: '한국지질자원연구원',
    aliases: ['KIGAM', '지질자원연구원', '지질연'],
    industrySector: 'ENVIRONMENT',
    defaultKeywords: ['지질', '자원', '광물', '에너지자원', '지하수'],
    confidence: 'high',
    focusArea: 'Geoscience/Resources',
    parentMinistry: '과학기술정보통신부',
  },

  KMA_AGENCY: {
    koreanName: '기상청',
    aliases: ['KMA', '기상청'],
    industrySector: 'ENVIRONMENT',
    defaultKeywords: ['기상', '기후', '날씨예보', '위성관측', '기상재해', '수치예보', '기상기술'],
    confidence: 'high',
    focusArea: 'Meteorological Services',
    parentMinistry: '기상청',
  },

  // ============================================================================
  // Agriculture & Food Tech
  // ============================================================================

  IPET: {
    koreanName: '농림식품기술기획평가원',
    aliases: ['농림기술기획평가원', 'IPET', '농림식품평가원'],
    industrySector: 'AGRICULTURE',
    defaultKeywords: ['스마트농업', '산업화기술', '육종', '병해충대응', '기술사업화', '농업', '식품', '스마트팜', '푸드테크'],
    confidence: 'high',
    focusArea: 'AgTech/Food Tech',
    parentMinistry: '농림축산식품부',
  },

  RDA: {
    koreanName: '농촌진흥청',
    aliases: ['RDA', '농진청'],
    industrySector: 'AGRICULTURE',
    defaultKeywords: ['농업연구', '농촌', '작물', '농업기술', '농촌개발', '품종개발'],
    confidence: 'high',
    focusArea: 'Agricultural Research',
    parentMinistry: '농림축산식품부',
  },

  KOFPI: {
    koreanName: '한국임업진흥원',
    aliases: ['임업진흥원', 'KOFPI'],
    industrySector: 'AGRICULTURE',
    defaultKeywords: ['산림', '임업', '목재', '산림자원', '임산물', '산림바이오'],
    confidence: 'high',
    focusArea: 'Forestry Technology',
    parentMinistry: '산림청',
  },

  NIFS: {
    koreanName: '국립수산과학원',
    aliases: ['NIFS', '수산과학원'],
    industrySector: 'AGRICULTURE',
    defaultKeywords: ['수산', '양식', '어업', '해양생물', '수산자원'],
    confidence: 'high',
    focusArea: 'Fisheries Research',
    parentMinistry: '해양수산부',
  },

  KGS: {
    koreanName: '(사)고려인삼학회',
    aliases: ['고려인삼학회', '인삼학회', 'KGS'],
    industrySector: 'AGRICULTURE',
    defaultKeywords: ['인삼', '고려인삼', '기능성식품', '약초', '한약재', '농산물'],
    confidence: 'medium',
    focusArea: 'Ginseng Research',
    parentMinistry: '기타',
  },

  // ============================================================================
  // Construction & Transportation
  // ============================================================================

  KAIA: {
    koreanName: '국토교통과학기술진흥원',
    aliases: ['국토교통진흥원', 'KAIA'],
    industrySector: 'CONSTRUCTION',
    defaultKeywords: ['국토교통R&D', '스마트시티', '탄소중립', '미래모빌리티', 'SOC안전', '건설', '교통', '인프라', '도시'],
    confidence: 'high',
    focusArea: 'Construction/Transport',
    parentMinistry: '국토교통부',
  },

  KRRI: {
    koreanName: '한국철도기술연구원',
    aliases: ['KRRI', '철도기술연구원', '철도연'],
    industrySector: 'CONSTRUCTION',
    defaultKeywords: ['철도', '고속철도', '도시철도', '철도안전', '철도기술'],
    confidence: 'high',
    focusArea: 'Railway Technology',
    parentMinistry: '국토교통부',
  },

  NDMI: {
    koreanName: '국립재난안전연구원',
    aliases: ['NDMI', '재난안전연구원'],
    industrySector: 'CONSTRUCTION',
    defaultKeywords: ['재난안전', '지진', '방재', '안전인프라', '재난대응', '재난관리'],
    confidence: 'high',
    focusArea: 'Disaster Management Research',
    parentMinistry: '행정안전부',
  },

  CHA_AGENCY: {
    koreanName: '국가유산청',
    aliases: ['문화재청', 'CHA', '유산청'],
    industrySector: 'CONSTRUCTION',
    defaultKeywords: ['문화유산', '문화재보존', '유산관리', '복원', '전통문화', '문화재'],
    confidence: 'high',
    focusArea: 'Cultural Heritage Administration',
    parentMinistry: '국가유산청',
  },

  // ============================================================================
  // Maritime & Ocean
  // ============================================================================

  KIMST: {
    koreanName: '해양수산과학기술진흥원',
    aliases: ['해양수산진흥원', 'KIMST', '해수진흥원'],
    industrySector: 'MARINE',
    defaultKeywords: ['친환경선박', '스마트항만', '자율운항선박', '디지털양식', '해양바이오', '해양', '수산', '양식', '해운', '조선'],
    confidence: 'high',
    focusArea: 'Maritime Technology',
    parentMinistry: '해양수산부',
  },

  KIOST: {
    koreanName: '한국해양과학기술원',
    aliases: ['KIOST', '해양연구원', '해양과기원'],
    industrySector: 'MARINE',
    defaultKeywords: ['해양과학', '해양연구', '해양환경', '해저', '해양자원'],
    confidence: 'high',
    focusArea: 'Ocean Science Research',
    parentMinistry: '해양수산부',
  },

  // ============================================================================
  // Defense Technology
  // ============================================================================

  KRIT: {
    koreanName: '국방기술진흥연구소',
    aliases: ['국방기술품질원', 'KRIT', 'DTaQ', '국방연구소'],
    industrySector: 'DEFENSE',
    defaultKeywords: ['핵심기술', '무기체계', '국방과학기술로드맵', '기술기획', '선행연구', '국방', '방위', '군사', '방산'],
    confidence: 'high',
    focusArea: 'Defense Technology',
    parentMinistry: '방위사업청',
  },

  ADD: {
    koreanName: '국방과학연구소',
    aliases: ['ADD', '국과연'],
    industrySector: 'DEFENSE',
    defaultKeywords: ['국방연구', '무기개발', '방위기술', '군사과학', '국방R&D'],
    confidence: 'high',
    focusArea: 'Defense R&D',
    parentMinistry: '방위사업청',
  },

  KAIDEC: {
    koreanName: '민군협력진흥원',
    aliases: ['KAIDEC', '민군진흥원'],
    industrySector: 'DEFENSE',
    defaultKeywords: ['민군기술', '국방', '방위산업', '군사기술이전', '민군협력', '민군겸용'],
    confidence: 'high',
    focusArea: 'Civil-Military Technology Transfer',
    parentMinistry: '다부처',
  },

  // ============================================================================
  // Content & Cultural Heritage
  // ============================================================================

  KOCCA: {
    koreanName: '한국콘텐츠진흥원',
    aliases: ['콘텐츠진흥원', 'KOCCA'],
    industrySector: 'CONTENT',
    defaultKeywords: ['콘텐츠', '미디어', '엔터테인먼트', '영상', '문화콘텐츠', '게임', 'K-콘텐츠'],
    confidence: 'high',
    focusArea: 'Content/Media Tech',
    parentMinistry: '문화체육관광부',
  },

  NRICH: {
    koreanName: '국립문화유산연구원',
    aliases: ['문화유산연구원', 'NRICH'],
    industrySector: 'CULTURAL_HERITAGE',
    defaultKeywords: ['문화재', '유산', '보존', '문화유산', '전통', '고고학'],
    confidence: 'high',
    focusArea: 'Cultural Heritage',
    parentMinistry: '문화재청',
  },

  KTV: {
    koreanName: '한국전통문화대학교',
    aliases: ['KTV', '전통문화대학교'],
    industrySector: 'CULTURAL_HERITAGE',
    defaultKeywords: ['전통문화', '문화재보존', '전통기술', '문화유산'],
    confidence: 'high',
    focusArea: 'Traditional Culture',
    parentMinistry: '문화재청',
  },

  // ============================================================================
  // Public Safety & Justice
  // ============================================================================

  SCPC: {
    koreanName: '과학치안진흥센터',
    aliases: ['SCPC', '치안센터'],
    industrySector: 'ICT',
    defaultKeywords: ['과학치안', '범죄예방', '공공안전', '치안기술', '스마트치안'],
    confidence: 'high',
    focusArea: 'Science-based Policing',
    parentMinistry: '경찰청',
  },

  KNPA_AGENCY: {
    koreanName: '경찰청',
    aliases: ['KNPA', '경찰청'],
    industrySector: 'ICT',
    defaultKeywords: ['과학치안', '치안기술', '범죄예방', '공공안전', '스마트치안', '치안R&D'],
    confidence: 'high',
    focusArea: 'Police Technology R&D',
    parentMinistry: '경찰청',
  },

  KNTI: {
    koreanName: '한국나노기술원',
    aliases: ['나노기술원', 'KNTI'],
    industrySector: 'ICT',
    defaultKeywords: ['나노기술', '양자', '반도체', '첨단소재', '나노소자'],
    confidence: 'high',
    focusArea: 'Nanotechnology/Quantum',
    parentMinistry: '기타',
  },

  // ============================================================================
  // Additional Research Institutes
  // ============================================================================

  KISTI: {
    koreanName: '한국과학기술정보연구원',
    aliases: ['KISTI', '과기정보연', '과학기술정보연구원'],
    industrySector: 'ICT',
    defaultKeywords: ['과학기술정보', '데이터', '슈퍼컴퓨팅', '연구정보', 'AI'],
    confidence: 'high',
    focusArea: 'Scientific Information/Computing',
    parentMinistry: '과학기술정보통신부',
  },

  KRICT: {
    koreanName: '한국화학연구원',
    aliases: ['KRICT', '화학연'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['화학', '화학공학', '신소재', '촉매', '고분자'],
    confidence: 'high',
    focusArea: 'Chemistry Research',
    parentMinistry: '과학기술정보통신부',
  },

  KIMM: {
    koreanName: '한국기계연구원',
    aliases: ['KIMM', '기계연'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['기계', '로봇', '제조기술', '자동화', '정밀기계'],
    confidence: 'high',
    focusArea: 'Mechanical Engineering',
    parentMinistry: '과학기술정보통신부',
  },

  KIMS: {
    koreanName: '한국재료연구원',
    aliases: ['KIMS', '재료연'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['신소재', '재료', '금속', '세라믹', '복합재료'],
    confidence: 'high',
    focusArea: 'Materials Science',
    parentMinistry: '과학기술정보통신부',
  },

  KERI: {
    koreanName: '한국전기연구원',
    aliases: ['KERI', '전기연'],
    industrySector: 'ENERGY',
    defaultKeywords: ['전기', '전력', '에너지저장', '전력변환', '전기기기'],
    confidence: 'high',
    focusArea: 'Electrical Engineering',
    parentMinistry: '과학기술정보통신부',
  },

  KEPCO: {
    koreanName: '한국전력공사',
    aliases: ['KEPCO', '한전'],
    industrySector: 'ENERGY',
    defaultKeywords: ['전력', '에너지', '송배전', '스마트그리드', '전력망'],
    confidence: 'high',
    focusArea: 'Electric Power',
    parentMinistry: '산업통상자원부',
  },

  KIPO: {
    koreanName: '특허청',
    aliases: ['KIPO', '특허청'],
    industrySector: 'ICT',
    defaultKeywords: ['특허', '지식재산', 'IP', '기술이전', '특허출원'],
    confidence: 'high',
    focusArea: 'Intellectual Property',
    parentMinistry: '특허청',
  },

  GSTEP: {
    koreanName: '경기도경제과학진흥원',
    aliases: ['경기과학진흥원', 'GSTEP', '경기진흥원'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['경기도', '지역산업', '섬유', '소부장', '기업육성', '기술개발'],
    confidence: 'medium',
    focusArea: 'Gyeonggi Regional Industry Support',
    parentMinistry: '기타',
  },

  KIPP: {
    koreanName: '한국조달연구원',
    aliases: ['조달연구원', 'KIPP'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['공공조달', '혁신제품', '공공구매', '시범구매', '기술개발'],
    confidence: 'medium',
    focusArea: 'Public Procurement Innovation',
    parentMinistry: '기타',
  },

  CNI: {
    koreanName: '충남연구원',
    aliases: ['CNI', '충남연구원'],
    industrySector: 'MANUFACTURING',
    defaultKeywords: ['충남', '지역산업', 'R&D발굴', '지역개발', '산업정책'],
    confidence: 'medium',
    focusArea: 'Chungnam Regional Development',
    parentMinistry: '기타',
  },

  KTC: {
    koreanName: '한국화학융합시험연구원',
    aliases: ['화학융합시험연구원', 'KTC'],
    industrySector: 'ENERGY',
    defaultKeywords: ['청정수소', '수소', 'MRV', '시험인증', '화학', '에너지'],
    confidence: 'medium',
    focusArea: 'Hydrogen Testing & Certification',
    parentMinistry: '기타',
  },

  NFA_AGENCY: {
    koreanName: '소방청',
    aliases: ['NFA', '소방청'],
    industrySector: 'ENERGY',
    defaultKeywords: ['소방안전', '재난대응', '화재안전', '배터리안전', '안전기술', '리튬배터리'],
    confidence: 'high',
    focusArea: 'Fire Safety Technology',
    parentMinistry: '소방청',
  },

  MOIS_AGENCY: {
    koreanName: '행정안전부',
    aliases: ['행안부', 'MOIS', '행정부'],
    industrySector: 'CONSTRUCTION',
    defaultKeywords: ['재난안전', '지진', '방재', '안전인프라', '긴급대응', '국민안전', '국민생활안전'],
    confidence: 'high',
    focusArea: 'Emergency Response/Public Safety',
    parentMinistry: '행정안전부',
  },
};

/**
 * Detect category from program title using domain-specific keywords
 *
 * November 13, 2025: Fixes NRF misclassification issue
 * Example: "나노 및 소재기술개발사업" → MATERIALS (not ICT)
 *
 * @param title - Program title
 * @returns Category detection result or null if no strong signal
 */
function detectCategoryFromTitle(
  title: string
): { category: string; keywords: string[]; confidence: 'high' | 'medium' } | null {
  const normalized = title.trim().toLowerCase();

  // Define domain-specific keyword patterns (order matters - check most specific first)
  const domainPatterns = [
    // ═══════════════════════════════════════════════════════════════════
    // ENERGY & NUCLEAR (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'ENERGY',
      keywords: ['원자력', '에너지'],
      patterns: ['원자력', '원전', '핵융합', 'smr', '소형모듈원자로', '원자로'],
      confidence: 'high' as const,
    },
    {
      category: 'ENERGY',
      keywords: ['에너지', '전력'],
      patterns: ['에너지', '수소', '태양광', '풍력', '신재생', '전력', '배터리'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // MATERIALS & MANUFACTURING (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'MANUFACTURING',
      keywords: ['나노', '소재', '재료'],
      patterns: ['나노', '소재', '재료', '부품', '장비', '소부장'],
      confidence: 'high' as const,
    },
    {
      category: 'MANUFACTURING',
      keywords: ['제조', '산업기술'],
      patterns: ['제조', '반도체', '디스플레이', '기계', '로봇', '자동차'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // BIO & HEALTHCARE (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'BIO_HEALTH',
      keywords: ['바이오', '의료', '생명공학'],
      patterns: ['바이오', '생명공학', '의료', '헬스케어', '제약', '신약', '백신', '진단'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // DEFENSE (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'DEFENSE',
      keywords: ['국방', '방위', '방산'],
      patterns: ['국방', '방위', '방산', '군사', '무기체계'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // ENVIRONMENT (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'ENVIRONMENT',
      keywords: ['환경', '탄소중립'],
      patterns: ['환경', '탄소중립', '기후', '녹색', '순환경제', '친환경'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // AGRICULTURE (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'AGRICULTURE',
      keywords: ['농업', '스마트팜'],
      patterns: ['농업', '농림', '축산', '식품', '스마트팜', '작물'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARINE (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'MARINE',
      keywords: ['해양', '수산'],
      patterns: ['해양', '수산', '조선', '해운', '양식'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTION (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'CONSTRUCTION',
      keywords: ['건설', '국토'],
      patterns: ['건설', '국토', '교통', '인프라', '스마트시티'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // CONTENT (high specificity)
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'CONTENT',
      keywords: ['콘텐츠', '문화'],
      patterns: ['콘텐츠', '문화', '미디어', '엔터테인먼트', '게임'],
      confidence: 'high' as const,
    },

    // ═══════════════════════════════════════════════════════════════════
    // ICT (medium specificity - only specific ICT terms, not general "정보통신")
    // ═══════════════════════════════════════════════════════════════════
    {
      category: 'ICT',
      keywords: ['ICT', '소프트웨어', 'AI'],
      patterns: ['소프트웨어', 'sw개발', '인공지능', '빅데이터', '클라우드', '사이버보안', '5g', '6g', '양자통신'],
      confidence: 'medium' as const,
    },
  ];

  // Check each pattern category
  for (const pattern of domainPatterns) {
    for (const keyword of pattern.patterns) {
      if (normalized.includes(keyword)) {
        // Found strong domain signal in title
        return {
          category: pattern.category,
          keywords: pattern.keywords,
          confidence: pattern.confidence,
        };
      }
    }
  }

  // No strong domain signal found
  return null;
}

/**
 * Extract industry category from ministry and announcing agency (Hierarchical Categorization)
 *
 * Enhanced with title-based categorization override (November 13, 2025)
 * Fixes misclassification of NRF programs (Nano/Materials, Nuclear, etc. marked as ICT)
 *
 * @param ministry - Full Korean name of the ministry (e.g., "과학기술정보통신부")
 * @param announcingAgency - Full Korean name of the agency (e.g., "한국환경산업기술원")
 * @param programTitle - Program title for domain detection (optional but recommended)
 * @returns Categorization result with category, keywords, confidence, and context
 */
export function extractCategoryFromMinistryAndAgency(
  ministry: string | null,
  announcingAgency: string | null,
  programTitle?: string | null
): CategorizationResult {
  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 1 (Jan 13, 2025): Official Taxonomy Classification (Primary)
  // Uses KSIC + NSTC standards with 500+ keywords
  // ═══════════════════════════════════════════════════════════════════════

  if (programTitle) {
    const officialResult = classifyWithOfficialTaxonomy(
      programTitle,
      ministry || undefined,
      announcingAgency || undefined
    );

    // High confidence from official taxonomy - use it directly
    if (officialResult.confidence === 'high') {
      const agencyMapping = announcingAgency ? getAgencyMapping(announcingAgency) : null;
      const ministryMapping = ministry ? getMinistryMapping(ministry) : null;

      return {
        category: officialResult.category,
        keywords: [
          ...officialResult.matchedKeywords,
          ...(agencyMapping?.defaultKeywords || []),
          ...(ministryMapping?.defaultKeywords || []),
        ],
        source: officialResult.source,
        confidence: 'high',
        requiresManualReview: false,
        context: `Official taxonomy classification (${officialResult.source}, ${officialResult.matchedKeywords.length} keywords)`,
      };
    }

    // Medium confidence - cross-check with agency/ministry mappings
    if (officialResult.confidence === 'medium') {
      const agencyCategory = announcingAgency ? lookupAgencyCategory(announcingAgency) : null;
      const ministryCategory = ministry ? lookupMinistryCategory(ministry) : null;

      // If agency/ministry agrees with official taxonomy, boost confidence
      if (agencyCategory === officialResult.category || ministryCategory === officialResult.category) {
        const agencyMapping = announcingAgency ? getAgencyMapping(announcingAgency) : null;
        const ministryMapping = ministry ? getMinistryMapping(ministry) : null;

        return {
          category: officialResult.category,
          keywords: [
            ...officialResult.matchedKeywords,
            ...(agencyMapping?.defaultKeywords || []),
            ...(ministryMapping?.defaultKeywords || []),
          ],
          source: 'both',
          confidence: 'high',
          requiresManualReview: false,
          context: `Official taxonomy + agency/ministry validation (${officialResult.source})`,
        };
      }

      // Agency/ministry conflicts with official taxonomy - need to determine which is more reliable
      if (agencyCategory && agencyCategory !== officialResult.category) {
        const agencyMapping = getAgencyMapping(announcingAgency!);
        const ministryMapping = ministry ? getMinistryMapping(ministry) : null;

        // Check if this is a cross-domain agency (NRF, KISTEP, etc.)
        // Cross-domain agencies have generic defaults but publish across all domains
        // For these, the taxonomy (based on title keywords) is more accurate
        const isCrossDomainAgency = ['한국연구재단', 'NRF', '한국과학기술기획평가원', 'KISTEP'].some(
          name => announcingAgency!.includes(name)
        );

        if (isCrossDomainAgency) {
          // For cross-domain agencies, trust the taxonomy over the generic agency default
          return {
            category: officialResult.category,
            keywords: [
              ...officialResult.matchedKeywords,
              ...(agencyMapping?.defaultKeywords || []),
              ...(ministryMapping?.defaultKeywords || []),
            ],
            source: 'nstc',
            confidence: 'high', // Boost confidence - taxonomy is reliable for cross-domain agencies
            requiresManualReview: false,
            context: `Cross-domain agency (${announcingAgency}) - taxonomy override (${officialResult.category} vs default ${agencyCategory})`,
          };
        }

        // For specialized agencies, the agency category is usually more specific than taxonomy
        return {
          category: agencyCategory,
          keywords: [
            ...(agencyMapping?.defaultKeywords || []),
            ...(ministryMapping?.defaultKeywords || []),
            ...officialResult.matchedKeywords,
          ],
          source: 'both',
          confidence: 'medium',
          requiresManualReview: true,
          context: `Specialized agency override (agency: ${agencyCategory} vs taxonomy: ${officialResult.category})`,
        };
      }

      // No agency mapping - use official taxonomy medium confidence
      const agencyMapping = announcingAgency ? getAgencyMapping(announcingAgency) : null;
      const ministryMapping = ministry ? getMinistryMapping(ministry) : null;

      return {
        category: officialResult.category,
        keywords: [
          ...officialResult.matchedKeywords,
          ...(agencyMapping?.defaultKeywords || []),
          ...(ministryMapping?.defaultKeywords || []),
        ],
        source: officialResult.source,
        confidence: 'medium',
        requiresManualReview: false,
        context: `Official taxonomy classification (${officialResult.source}, medium confidence)`,
      };
    }

    // Low confidence from official taxonomy - fall back to legacy logic below
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2: Legacy Agency/Ministry Logic (Fallback)
  // Used when title unavailable or official taxonomy has low confidence
  // ═══════════════════════════════════════════════════════════════════════

  // Case 1: Both ministry and agency available (IDEAL)
  if (ministry && announcingAgency) {
    const agencyCategory = lookupAgencyCategory(announcingAgency);
    const ministryCategory = lookupMinistryCategory(ministry);

    if (agencyCategory) {
      // Agency found - use agency category with ministry keywords as supplement
      const agencyMapping = getAgencyMapping(announcingAgency);
      const ministryMapping = getMinistryMapping(ministry);

      // ═══════════════════════════════════════════════════════════════════════
      // ENHANCEMENT (Nov 13, 2025): Title-based override for cross-domain agencies
      // Problem: NRF (한국연구재단) defaults to ICT but publishes programs across all domains
      // Solution: Detect domain keywords in title and override default classification
      // ═══════════════════════════════════════════════════════════════════════

      // Check if this is a cross-domain agency (NRF, KISTEP, etc.)
      const isCrossDomainAgency = ['한국연구재단', 'NRF', '한국과학기술기획평가원', 'KISTEP'].some(
        name => announcingAgency.includes(name)
      );

      if (isCrossDomainAgency && programTitle) {
        const titleBasedCategory = detectCategoryFromTitle(programTitle);

        if (titleBasedCategory) {
          // Title provides strong domain signal - override agency default
          return {
            category: titleBasedCategory.category,
            keywords: [
              ...titleBasedCategory.keywords,
              ...(agencyMapping?.defaultKeywords || []),
              ...(ministryMapping?.defaultKeywords || []),
            ],
            source: 'both',
            confidence: titleBasedCategory.confidence,
            requiresManualReview: false,
            context: `Title-based override for cross-domain agency (detected: ${titleBasedCategory.category})`,
          };
        }
      }

      return {
        category: agencyCategory,
        keywords: [
          ...(agencyMapping?.defaultKeywords || []),
          ...(ministryMapping?.defaultKeywords || []),
        ],
        source: 'both',
        confidence: agencyMapping?.confidence || 'medium',
        requiresManualReview: false,
      };
    } else if (ministryCategory) {
      // Agency not found, use ministry as fallback with context
      const ministryMapping = getMinistryMapping(ministry);
      return {
        category: ministryCategory,
        keywords: ministryMapping?.defaultKeywords || [],
        source: 'fallback',
        confidence: 'medium',
        requiresManualReview: true,
        context: `Ministry-based categorization (Agency "${announcingAgency}" not mapped)`,
      };
    }
  }

  // Case 2: Only agency available (ministry NULL)
  if (announcingAgency) {
    const agencyCategory = lookupAgencyCategory(announcingAgency);
    if (agencyCategory) {
      const agencyMapping = getAgencyMapping(announcingAgency);
      return {
        category: agencyCategory,
        keywords: agencyMapping?.defaultKeywords || [],
        source: 'agency',
        confidence: agencyMapping?.confidence || 'medium',
        requiresManualReview: false,
        context: `Agency-based categorization (Ministry NULL)`,
      };
    } else {
      // Try pattern-based fallback
      const patternCategory = patternBasedCategorization(announcingAgency);
      if (patternCategory) {
        return {
          category: patternCategory.category,
          keywords: patternCategory.keywords,
          source: 'fallback',
          confidence: 'low',
          requiresManualReview: true,
          context: `Pattern-based categorization for "${announcingAgency}"`,
        };
      }
    }
  }

  // Case 3: Only ministry available (agency NULL)
  if (ministry) {
    const ministryCategory = lookupMinistryCategory(ministry);
    if (ministryCategory) {
      const ministryMapping = getMinistryMapping(ministry);
      return {
        category: ministryCategory,
        keywords: ministryMapping?.defaultKeywords || [],
        source: 'ministry',
        confidence: 'medium',
        requiresManualReview: true,
        context: `Ministry-based categorization (Agency NULL)`,
      };
    }
  }

  // Case 4: Both NULL or unmapped - MANUAL REVIEW REQUIRED
  return {
    category: null,
    keywords: [],
    source: 'manual_review',
    confidence: 'none',
    requiresManualReview: true,
    context: `Manual review required (Ministry: ${ministry || 'NULL'}, Agency: ${announcingAgency || 'NULL'})`,
  };
}

/**
 * Lookup agency category (internal helper)
 */
function lookupAgencyCategory(announcingAgency: string): string | null {
  const normalizedAgency = announcingAgency.trim().replace(/\s+/g, '');

  for (const mapping of Object.values(AGENCY_MAPPINGS)) {
    if (normalizedAgency.includes(mapping.koreanName.replace(/\s+/g, ''))) {
      return mapping.industrySector;
    }

    for (const alias of mapping.aliases) {
      if (normalizedAgency.includes(alias.replace(/\s+/g, ''))) {
        return mapping.industrySector;
      }
    }
  }

  return null;
}

/**
 * Lookup ministry category (internal helper)
 */
function lookupMinistryCategory(ministry: string): string | null {
  const normalizedMinistry = ministry.trim().replace(/\s+/g, '');

  for (const mapping of Object.values(MINISTRY_MAPPINGS)) {
    if (normalizedMinistry.includes(mapping.koreanName.replace(/\s+/g, ''))) {
      return mapping.primarySector;
    }

    for (const alias of mapping.aliases) {
      if (normalizedMinistry.includes(alias.replace(/\s+/g, ''))) {
        return mapping.primarySector;
      }
    }
  }

  return null;
}

/**
 * Pattern-based categorization fallback (when agency not in mappings)
 */
function patternBasedCategorization(
  text: string
): { category: string; keywords: string[] } | null {
  const normalized = text.trim().replace(/\s+/g, '');

  const patterns = [
    { keywords: ['환경', '친환경', '탄소'], category: 'ENVIRONMENT', defaultKeywords: ['환경', '친환경'] },
    { keywords: ['농림', '농업', '축산'], category: 'AGRICULTURE', defaultKeywords: ['농업', '농림'] },
    { keywords: ['해양', '수산', '어업'], category: 'MARINE', defaultKeywords: ['해양', '수산'] },
    { keywords: ['산업기술', '제조', '산업'], category: 'MANUFACTURING', defaultKeywords: ['산업기술', '제조'] },
    { keywords: ['정보통신', 'ICT', 'SW'], category: 'ICT', defaultKeywords: ['ICT', '정보통신'] },
    { keywords: ['에너지', '전력', '발전'], category: 'ENERGY', defaultKeywords: ['에너지', '전력'] },
    { keywords: ['건설', '국토', '교통'], category: 'CONSTRUCTION', defaultKeywords: ['건설', '국토'] },
    { keywords: ['보건', '의료', '바이오'], category: 'BIO_HEALTH', defaultKeywords: ['보건', '의료'] },
    { keywords: ['국방', '방위', '군사'], category: 'DEFENSE', defaultKeywords: ['국방', '방위'] },
    { keywords: ['콘텐츠', '문화', '미디어'], category: 'CONTENT', defaultKeywords: ['콘텐츠', '문화'] },
  ];

  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword)) {
        return {
          category: pattern.category,
          keywords: pattern.defaultKeywords,
        };
      }
    }
  }

  return null;
}

/**
 * Get ministry mapping details
 */
function getMinistryMapping(ministry: string | null): MinistryMapping | null {
  if (!ministry) return null;

  const normalizedMinistry = ministry.trim().replace(/\s+/g, '');

  for (const mapping of Object.values(MINISTRY_MAPPINGS)) {
    if (normalizedMinistry.includes(mapping.koreanName.replace(/\s+/g, ''))) {
      return mapping;
    }

    for (const alias of mapping.aliases) {
      if (normalizedMinistry.includes(alias.replace(/\s+/g, ''))) {
        return mapping;
      }
    }
  }

  return null;
}

/**
 * DEPRECATED: Use extractCategoryFromMinistryAndAgency instead
 * @deprecated
 */
export function extractCategoryFromAgency(announcingAgency: string | null): string | null {
  const result = extractCategoryFromMinistryAndAgency(null, announcingAgency);
  return result.category;
}

/**
 * Get combined keywords from ministry and agency
 *
 * @param ministry - Full Korean name of the ministry
 * @param announcingAgency - Full Korean name of the agency
 * @returns Array of combined keywords (agency + ministry)
 */
export function getCombinedKeywords(
  ministry: string | null,
  announcingAgency: string | null
): string[] {
  const agencyMapping = getAgencyMapping(announcingAgency);
  const ministryMapping = getMinistryMapping(ministry);

  const keywords = new Set<string>();

  // Add agency keywords (higher priority)
  if (agencyMapping) {
    agencyMapping.defaultKeywords.forEach((keyword) => keywords.add(keyword));
  }

  // Add ministry keywords (supplementary)
  if (ministryMapping) {
    ministryMapping.defaultKeywords.forEach((keyword) => keywords.add(keyword));
  }

  return Array.from(keywords);
}

/**
 * DEPRECATED: Use getCombinedKeywords instead
 * @deprecated
 */
export function getAgencyKeywords(announcingAgency: string | null): string[] {
  return getCombinedKeywords(null, announcingAgency);
}

/**
 * Get agency mapping details for a given agency
 *
 * @param announcingAgency - Full Korean name of the agency
 * @returns Agency mapping object or null if not found
 */
export function getAgencyMapping(announcingAgency: string | null): AgencyMapping | null {
  if (!announcingAgency) {
    return null;
  }

  const normalizedAgency = announcingAgency.trim().replace(/\s+/g, '');

  for (const mapping of Object.values(AGENCY_MAPPINGS)) {
    if (normalizedAgency.includes(mapping.koreanName.replace(/\s+/g, ''))) {
      return mapping;
    }

    for (const alias of mapping.aliases) {
      if (normalizedAgency.includes(alias.replace(/\s+/g, ''))) {
        return mapping;
      }
    }
  }

  return null;
}

/**
 * DEPRECATED: Use extractCategoryFromMinistryAndAgency().confidence instead
 * @deprecated
 */
export function getCategorizationConfidence(
  announcingAgency: string | null
): 'high' | 'medium' | 'low' | 'none' {
  if (!announcingAgency) {
    return 'none';
  }

  const normalizedAgency = announcingAgency.trim().replace(/\s+/g, '');

  // Check for exact match
  for (const mapping of Object.values(AGENCY_MAPPINGS)) {
    if (normalizedAgency.includes(mapping.koreanName.replace(/\s+/g, ''))) {
      return mapping.confidence;
    }

    for (const alias of mapping.aliases) {
      if (normalizedAgency.includes(alias.replace(/\s+/g, ''))) {
        return mapping.confidence;
      }
    }
  }

  // Fallback patterns have low confidence
  if (
    normalizedAgency.includes('환경') ||
    normalizedAgency.includes('농림') ||
    normalizedAgency.includes('해양') ||
    normalizedAgency.includes('산업') ||
    normalizedAgency.includes('정보통신')
  ) {
    return 'low';
  }

  return 'none';
}
