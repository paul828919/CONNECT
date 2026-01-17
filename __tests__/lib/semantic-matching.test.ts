/**
 * Unit Tests for Keyword-Based Industry Classification
 *
 * Tests the classifyProgram function which implements deterministic
 * keyword-rule based matching derived from 450+ NTIS program titles.
 *
 * Algorithm v4.0 Changes:
 * - Removed LLM semantic enrichment (61% failure rate, ~₩27/program)
 * - Added keyword-based classification (100% coverage, ₩0 cost)
 * - Ministry + keyword scoring for industry determination
 */

import {
  classifyProgram,
  getIndustryRelevance,
  getIndustryKoreanLabel,
  type ClassificationResult,
} from '@/lib/matching/keyword-classifier';

describe('classifyProgram', () => {
  // ═══════════════════════════════════════════════════════════════
  // Ministry-Based Classification Tests
  // ═══════════════════════════════════════════════════════════════

  describe('ministry-based classification', () => {
    it('should classify 보건복지부 programs as BIO_HEALTH', () => {
      const result = classifyProgram(
        '2026년 신약개발 지원사업 공고',
        null,
        '보건복지부'
      );

      expect(result.industry).toBe('BIO_HEALTH');
      expect(result.ministryBased).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should classify 해양수산부 programs as MARINE_FISHERIES', () => {
      const result = classifyProgram(
        '2026년 수산양식 기술개발 지원사업',
        null,
        '해양수산부'
      );

      expect(result.industry).toBe('MARINE_FISHERIES');
      expect(result.ministryBased).toBe(true);
    });

    it('should classify 해양경찰청 programs as MARINE_SECURITY', () => {
      const result = classifyProgram(
        '해양안전 VTS 시스템 고도화 사업',
        null,
        '해양경찰청'
      );

      expect(result.industry).toBe('MARINE_SECURITY');
      expect(result.ministryBased).toBe(true);
    });

    it('should classify 산림청 programs as FORESTRY', () => {
      const result = classifyProgram(
        '산불 예방 및 진화 기술 개발',
        null,
        '산림청'
      );

      expect(result.industry).toBe('FORESTRY');
      expect(result.ministryBased).toBe(true);
    });

    it('should classify 우주항공청 programs as AEROSPACE', () => {
      const result = classifyProgram(
        '차세대 발사체 기술 개발 지원',
        null,
        '우주항공청'
      );

      expect(result.industry).toBe('AEROSPACE');
      expect(result.ministryBased).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Keyword-Based Classification Tests
  // ═══════════════════════════════════════════════════════════════

  describe('keyword-based classification', () => {
    it('should classify bio/health keywords correctly', () => {
      const result = classifyProgram(
        '바이오의약품 임상시험 지원사업',
        null,
        null
      );

      expect(result.industry).toBe('BIO_HEALTH');
      expect(result.matchedKeywords).toContain('바이오');
      expect(result.matchedKeywords).toContain('임상');
    });

    it('should classify ICT keywords correctly', () => {
      const result = classifyProgram(
        '인공지능 소프트웨어 개발 지원',
        null,
        null
      );

      expect(result.industry).toBe('ICT');
      expect(result.matchedKeywords).toContain('인공지능');
      expect(result.matchedKeywords).toContain('소프트웨어');
    });

    it('should classify veterinary keywords separately from BIO_HEALTH', () => {
      // With ministry context, VETERINARY keywords win
      const result = classifyProgram(
        '반려동물 동물의약품 개발 사업',
        null,
        null
      );

      // Without ministry, multiple VETERINARY keywords needed to beat BIO_HEALTH
      expect(result.industry).toBe('VETERINARY');
      expect(result.matchedKeywords).toContain('반려동물');
      expect(result.matchedKeywords).toContain('동물의약품');
    });

    it('should classify forestry keywords separately from AGRICULTURE', () => {
      const result = classifyProgram(
        '산림 바이오매스 활용 목재 가공 기술',
        null,
        null
      );

      expect(result.industry).toBe('FORESTRY');
      expect(result.matchedKeywords).toContain('산림');
      expect(result.matchedKeywords).toContain('목재');
    });

    it('should classify aerospace keywords', () => {
      const result = classifyProgram(
        '우주 탐사 위성 기술 개발',
        null,
        null
      );

      expect(result.industry).toBe('AEROSPACE');
      expect(result.matchedKeywords).toContain('우주');
      expect(result.matchedKeywords).toContain('위성');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Combined Ministry + Keyword Classification
  // ═══════════════════════════════════════════════════════════════

  describe('combined ministry + keyword classification', () => {
    it('should give higher confidence with ministry + keyword match', () => {
      const withMinistry = classifyProgram(
        '바이오의약품 개발 지원',
        null,
        '보건복지부'
      );

      const withoutMinistry = classifyProgram(
        '바이오의약품 개발 지원',
        null,
        null
      );

      expect(withMinistry.confidence).toBeGreaterThan(withoutMinistry.confidence);
    });

    it('should handle 농림축산식품부 with VETERINARY keywords as VETERINARY', () => {
      const result = classifyProgram(
        '동물의약품 품질관리 강화 사업',
        null,
        '농림축산식품부'
      );

      // Should be VETERINARY because keyword score trumps ministry's AGRICULTURE
      expect(result.industry).toBe('VETERINARY');
      expect(result.matchedKeywords).toContain('동물의약품');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should return GENERAL for unknown ministry and no keywords', () => {
      const result = classifyProgram(
        '일반 R&D 지원사업',
        null,
        '알수없는부처'
      );

      expect(result.industry).toBe('GENERAL');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should handle empty title gracefully', () => {
      const result = classifyProgram(
        '',
        null,
        '보건복지부'
      );

      expect(result.industry).toBe('BIO_HEALTH');
      expect(result.ministryBased).toBe(true);
    });

    it('should handle null ministry gracefully', () => {
      const result = classifyProgram(
        '태양광 발전 효율화 연구',
        null,
        null
      );

      expect(result.industry).toBe('ENERGY');
      expect(result.ministryBased).toBe(false);
    });
  });
});

describe('getIndustryRelevance', () => {
  // ═══════════════════════════════════════════════════════════════
  // Exact Match Tests
  // ═══════════════════════════════════════════════════════════════

  describe('exact industry match', () => {
    it('should return 1.0 for exact industry match', () => {
      expect(getIndustryRelevance('BIO_HEALTH', 'BIO_HEALTH')).toBe(1.0);
      expect(getIndustryRelevance('ICT', 'ICT')).toBe(1.0);
      expect(getIndustryRelevance('MANUFACTURING', 'MANUFACTURING')).toBe(1.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Cross-Relevance Tests
  // ═══════════════════════════════════════════════════════════════

  describe('cross-industry relevance', () => {
    it('should return low relevance for MARINE_FISHERIES vs MARINE_SECURITY', () => {
      const relevance = getIndustryRelevance('MARINE_FISHERIES', 'MARINE_SECURITY');
      expect(relevance).toBe(0.3);
    });

    it('should return high relevance for VETERINARY vs AGRICULTURE', () => {
      const relevance = getIndustryRelevance('VETERINARY', 'AGRICULTURE');
      expect(relevance).toBe(0.7);
    });

    it('should return moderate relevance for FORESTRY vs AGRICULTURE', () => {
      const relevance = getIndustryRelevance('FORESTRY', 'AGRICULTURE');
      expect(relevance).toBe(0.4);
    });

    it('should return moderate relevance for BIO_HEALTH vs VETERINARY', () => {
      const relevance = getIndustryRelevance('BIO_HEALTH', 'VETERINARY');
      expect(relevance).toBe(0.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Default Relevance Tests
  // ═══════════════════════════════════════════════════════════════

  describe('default relevance', () => {
    it('should return low relevance for unrelated industries', () => {
      const relevance = getIndustryRelevance('DEFENSE', 'CULTURAL');
      expect(relevance).toBe(0.2);
    });

    it('should return moderate relevance for null org industry', () => {
      const relevance = getIndustryRelevance(null, 'BIO_HEALTH');
      expect(relevance).toBe(0.5);
    });
  });
});

describe('getIndustryKoreanLabel', () => {
  it('should return correct Korean labels', () => {
    expect(getIndustryKoreanLabel('BIO_HEALTH')).toBe('바이오/헬스케어');
    expect(getIndustryKoreanLabel('ICT')).toBe('ICT/정보통신');
    expect(getIndustryKoreanLabel('MARINE_FISHERIES')).toBe('해양/수산');
    expect(getIndustryKoreanLabel('MARINE_SECURITY')).toBe('해양안전/경비');
    expect(getIndustryKoreanLabel('FORESTRY')).toBe('산림/임업');
    expect(getIndustryKoreanLabel('VETERINARY')).toBe('수의/동물의약');
    expect(getIndustryKoreanLabel('AEROSPACE')).toBe('우주항공');
  });
});

// ═══════════════════════════════════════════════════════════════
// Real-World Scenario Tests (CTC Back Case)
// ═══════════════════════════════════════════════════════════════

describe('real-world scenario: veterinary company matching', () => {
  it('should correctly classify animal vaccine programs', () => {
    const result = classifyProgram(
      '반려동물 난치성질환 극복 및 진단 의료기기 기술개발',
      null,
      '농림축산식품부'
    );

    expect(result.industry).toBe('VETERINARY');
    expect(result.matchedKeywords).toContain('반려동물');
  });

  it('should correctly classify human medicine programs', () => {
    const result = classifyProgram(
      '희귀질환 치료제 임상시험 지원사업',
      null,
      '보건복지부'
    );

    expect(result.industry).toBe('BIO_HEALTH');
    expect(result.matchedKeywords).toContain('치료제');
    expect(result.matchedKeywords).toContain('임상');
  });

  it('should correctly distinguish marine fisheries from security', () => {
    const fisheries = classifyProgram(
      '수산양식 기술 고도화 사업',
      null,
      '해양수산부'
    );

    const security = classifyProgram(
      'VTS 해양안전 시스템 개발',
      null,
      '해양경찰청'
    );

    expect(fisheries.industry).toBe('MARINE_FISHERIES');
    expect(security.industry).toBe('MARINE_SECURITY');
    expect(fisheries.industry).not.toBe(security.industry);
  });
});
