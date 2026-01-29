/**
 * Unit tests for keyword-classifier.ts
 * Focus: Regional program detection (v2.0)
 */

import {
  classifyProgram,
  classifyProgramExtended,
  isRegionalRequiredProgram,
  getIndustryKoreanLabel,
} from '../keyword-classifier';

describe('classifyProgram', () => {
  describe('Local Venture Programs', () => {
    it('should classify 로컬벤처 as GENERAL (industry-agnostic)', () => {
      const result = classifyProgram(
        '2026년 강원 로컬벤처기업 육성사업 참가자 모집 공고',
        null,
        null
      );
      expect(result.industry).toBe('GENERAL');
      expect(result.matchedKeywords).toContain('로컬벤처');
    });

    it('should classify 로컬크리에이터 as GENERAL', () => {
      const result = classifyProgram(
        '로컬크리에이터 지원사업',
        null,
        null
      );
      expect(result.industry).toBe('GENERAL');
    });

    it('should classify 로컬푸드 as AGRICULTURE', () => {
      const result = classifyProgram(
        '로컬푸드 유통 지원사업',
        null,
        null
      );
      expect(result.industry).toBe('AGRICULTURE');
    });
  });

  describe('Regional Keywords', () => {
    it('should classify 지역자원 as GENERAL', () => {
      const result = classifyProgram(
        '지역자원 활용 창업지원',
        null,
        null
      );
      expect(result.industry).toBe('GENERAL');
      expect(result.matchedKeywords).toContain('지역자원');
    });

    it('should classify 지역특화 as GENERAL', () => {
      const result = classifyProgram(
        '지역특화산업 육성사업',
        null,
        null
      );
      expect(result.industry).toBe('GENERAL');
    });
  });
});

describe('isRegionalRequiredProgram', () => {
  it('should return true for 로컬벤처 programs', () => {
    expect(isRegionalRequiredProgram(
      '2026년 강원 로컬벤처기업 육성사업 참가자 모집 공고'
    )).toBe(true);
  });

  it('should return true for 로컬크리에이터 programs', () => {
    expect(isRegionalRequiredProgram(
      '로컬크리에이터 지원사업'
    )).toBe(true);
  });

  it('should return true for 지역혁신선도 programs', () => {
    expect(isRegionalRequiredProgram(
      '지역혁신선도기업육성(R&D) 사업'
    )).toBe(true);
  });

  it('should return true for 지역특화 programs', () => {
    expect(isRegionalRequiredProgram(
      '지역특화산업 육성'
    )).toBe(true);
  });

  it('should return true for 지역주도 programs', () => {
    expect(isRegionalRequiredProgram(
      '지역주도형 청년일자리 사업'
    )).toBe(true);
  });

  it('should return false for nationwide programs', () => {
    expect(isRegionalRequiredProgram(
      '중소기업 기술혁신개발사업'
    )).toBe(false);

    expect(isRegionalRequiredProgram(
      '창업성장기술개발사업'
    )).toBe(false);

    expect(isRegionalRequiredProgram(
      'TIPS 프로그램'
    )).toBe(false);
  });

  it('should check description when provided', () => {
    expect(isRegionalRequiredProgram(
      '창업 지원사업',
      '지역자원을 활용한 로컬벤처기업 육성'
    )).toBe(true);
  });
});

describe('classifyProgramExtended', () => {
  it('should include regional flag for 로컬벤처 programs', () => {
    const result = classifyProgramExtended(
      '2026년 강원 로컬벤처기업 육성사업',
      null,
      null,
      '강원창조경제혁신센터는 지역 자원을 활용한 창의적인 아이디어로 기업의 가치와 경쟁력을 강화하는 로컬벤처기업과 함께합니다'
    );

    expect(result.industry).toBe('GENERAL');
    expect(result.requiresRegionalFilter).toBe(true);
    expect(result.regionalKeywords).toContain('로컬벤처');
  });

  it('should NOT include regional flag for nationwide programs', () => {
    const result = classifyProgramExtended(
      '중소기업 기술혁신개발사업',
      null,
      '중소벤처기업부',
      '전국 중소기업 대상 R&D 지원'
    );

    expect(result.requiresRegionalFilter).toBe(false);
    expect(result.regionalKeywords).toHaveLength(0);
  });

  it('should detect multiple regional keywords', () => {
    const result = classifyProgramExtended(
      '지역혁신선도 로컬벤처 육성사업',
      null,
      null,
      '지역자원 활용 지역특화 산업 지원'
    );

    expect(result.requiresRegionalFilter).toBe(true);
    expect(result.regionalKeywords.length).toBeGreaterThan(1);
  });
});

describe('getIndustryKoreanLabel', () => {
  it('should return Korean label for GENERAL', () => {
    expect(getIndustryKoreanLabel('GENERAL')).toBe('일반/범용');
  });

  it('should return Korean label for ICT', () => {
    expect(getIndustryKoreanLabel('ICT')).toBe('ICT/정보통신');
  });

  it('should return Korean label for AGRICULTURE', () => {
    expect(getIndustryKoreanLabel('AGRICULTURE')).toBe('농업/축산');
  });
});
