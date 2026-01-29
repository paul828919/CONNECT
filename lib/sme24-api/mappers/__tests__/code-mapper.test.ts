/**
 * Unit tests for code-mapper.ts
 * Focus: extractRegionFromTitle() enhanced patterns (v2.0)
 */

import {
  extractRegionFromTitle,
  hasRegionalIndicatorInTitle,
  inferBusinessAgeFromText,
  inferPreStartupFromText,
  extractSupportAmountFromText,
} from '../code-mapper';
import { KoreanRegion } from '@prisma/client';

describe('extractRegionFromTitle', () => {
  describe('Pattern 1: Bracketed region at start', () => {
    it('should extract single region from brackets', () => {
      expect(extractRegionFromTitle('[대구] 2025년 창업지원')).toEqual(['DAEGU']);
      expect(extractRegionFromTitle('[전남] 소상공인 지원사업')).toEqual(['JEONNAM']);
      expect(extractRegionFromTitle('[강원] 로컬벤처 육성')).toEqual(['GANGWON']);
    });

    it('should extract multiple regions from brackets with separators', () => {
      expect(extractRegionFromTitle('[대구ㆍ경북] 공동사업')).toEqual(['DAEGU', 'GYEONGBUK']);
      expect(extractRegionFromTitle('[부산/울산] 협력사업')).toEqual(['BUSAN', 'ULSAN']);
    });
  });

  describe('Pattern 2: Region at start without brackets', () => {
    it('should extract region followed by space', () => {
      expect(extractRegionFromTitle('대구 주도형 AI 대전환')).toEqual(['DAEGU']);
      expect(extractRegionFromTitle('부산 창업지원 프로그램')).toEqual(['BUSAN']);
    });

    it('should extract region with 시/도 suffix', () => {
      expect(extractRegionFromTitle('서울시 중소기업 지원')).toEqual(['SEOUL']);
      expect(extractRegionFromTitle('경기도 스타트업 육성')).toEqual(['GYEONGGI']);
    });
  });

  describe('Pattern 3 (v2.0): Region after year prefix', () => {
    it('should extract region after 년 prefix', () => {
      expect(extractRegionFromTitle('2026년 강원 로컬벤처기업 육성사업 참가자 모집 공고')).toEqual(['GANGWON']);
      expect(extractRegionFromTitle('2025년 부산 창업지원 프로그램')).toEqual(['BUSAN']);
      expect(extractRegionFromTitle('2026년 경기 스타트업 육성사업')).toEqual(['GYEONGGI']);
    });

    it('should extract region after 년도 prefix', () => {
      expect(extractRegionFromTitle('2025년도 대전 중소기업 지원')).toEqual(['DAEJEON']);
      expect(extractRegionFromTitle('2026년도 인천 창업 프로그램')).toEqual(['INCHEON']);
    });
  });

  describe('Pattern 4 (v2.0): Region with context keywords', () => {
    it('should extract region followed by 로컬벤처', () => {
      expect(extractRegionFromTitle('강원 로컬벤처 육성사업')).toEqual(['GANGWON']);
      expect(extractRegionFromTitle('전북 로컬벤처기업 지원')).toEqual(['JEONBUK']);
    });

    it('should extract region followed by 창업', () => {
      expect(extractRegionFromTitle('부산 창업지원 프로그램 모집')).toEqual(['BUSAN']);
      expect(extractRegionFromTitle('대구 창업 생태계 조성')).toEqual(['DAEGU']);
    });

    it('should extract region followed by 스타트업', () => {
      expect(extractRegionFromTitle('경남 스타트업 육성사업')).toEqual(['GYEONGNAM']);
    });

    it('should extract region followed by 로컬크리에이터', () => {
      expect(extractRegionFromTitle('제주 로컬크리에이터 지원')).toEqual(['JEJU']);
    });
  });

  describe('Negative cases (should NOT extract region)', () => {
    it('should return empty for nationwide programs', () => {
      expect(extractRegionFromTitle('2026년 중소기업 R&D 지원사업')).toEqual([]);
      expect(extractRegionFromTitle('전국 소상공인 지원')).toEqual([]);
      expect(extractRegionFromTitle('중소벤처기업부 창업지원 프로그램')).toEqual([]);
    });

    it('should not false-positive on region names within other words', () => {
      // "강원" in "강원료" or other compounds should not match
      expect(extractRegionFromTitle('2026년 국가연구개발 지원')).toEqual([]);
    });
  });

  describe('Priority: Earlier patterns take precedence', () => {
    it('should prefer bracketed region over year prefix pattern', () => {
      expect(extractRegionFromTitle('[서울] 2026년 대구 협력사업')).toEqual(['SEOUL']);
    });
  });
});

describe('hasRegionalIndicatorInTitle', () => {
  it('should return true for regional programs', () => {
    expect(hasRegionalIndicatorInTitle('2026년 강원 로컬벤처기업 육성사업')).toBe(true);
    expect(hasRegionalIndicatorInTitle('[대구] 창업지원')).toBe(true);
  });

  it('should return false for nationwide programs', () => {
    expect(hasRegionalIndicatorInTitle('2026년 중소기업 R&D 지원')).toBe(false);
    expect(hasRegionalIndicatorInTitle('전국 소상공인 대출')).toBe(false);
  });
});

// ============================================================================
// Phase 2: Business Age Inference Tests
// ============================================================================

describe('inferBusinessAgeFromText', () => {
  describe('Pattern: 창업 N년 이내', () => {
    it('should extract maxBusinessAge from "창업 7년 이내"', () => {
      const text = '2026. 1. 19. 기준 창업 7년 이내 기업의 대표자';
      const result = inferBusinessAgeFromText(text);
      expect(result.maxBusinessAge).toBe(7);
      expect(result.minBusinessAge).toBeNull();
    });

    it('should extract maxBusinessAge from "창업 3년 이내"', () => {
      const result = inferBusinessAgeFromText('창업 3년 이내 기업');
      expect(result.maxBusinessAge).toBe(3);
    });
  });

  describe('Pattern: 업력 N년 미만', () => {
    it('should extract maxBusinessAge from "업력 5년 미만"', () => {
      const result = inferBusinessAgeFromText('업력 5년 미만 기업 대상');
      expect(result.maxBusinessAge).toBe(4); // 5-1 = 4
    });
  });

  describe('Pattern: 업력 N년 이상', () => {
    it('should extract minBusinessAge from "업력 3년 이상"', () => {
      const result = inferBusinessAgeFromText('업력 3년 이상 기업');
      expect(result.minBusinessAge).toBe(3);
    });
  });

  describe('Pattern: 업력 N년~M년', () => {
    it('should extract both min and max from range', () => {
      const result = inferBusinessAgeFromText('업력 3년~7년 기업 대상');
      expect(result.minBusinessAge).toBe(3);
      expect(result.maxBusinessAge).toBe(7);
    });
  });

  describe('Pattern: Stage-based inference (창업기/도약기)', () => {
    it('should infer maxBusinessAge=7 when 창업기 and 도약기 present', () => {
      const text = '창업기: 2025년 1월 창업 ~ 예비창업가 / 도약기: 2019년 1월 ~ 2022년 12월';
      const result = inferBusinessAgeFromText(text);
      expect(result.maxBusinessAge).toBe(7);
    });
  });

  describe('SME24 code generation', () => {
    it('should generate OI01-OI04 codes for maxBusinessAge=7', () => {
      // "창업 7년 이내" means 0-7 years inclusive
      // Companies with OI04 code (7-9 years) include 7-year companies who ARE eligible
      const result = inferBusinessAgeFromText('창업 7년 이내');
      expect(result.inferredCodes).toContain('OI01'); // 3년미만
      expect(result.inferredCodes).toContain('OI02'); // 3~5년미만
      expect(result.inferredCodes).toContain('OI03'); // 5~7년미만
      expect(result.inferredCodes).toContain('OI04'); // 7~10년미만 (7-year companies eligible)
      expect(result.inferredCodes).not.toContain('OI05'); // 10~20년미만 (excluded)
    });
  });

  describe('No pattern match', () => {
    it('should return nulls when no pattern matches', () => {
      const result = inferBusinessAgeFromText('일반 중소기업 지원사업');
      expect(result.minBusinessAge).toBeNull();
      expect(result.maxBusinessAge).toBeNull();
      expect(result.inferredCodes).toHaveLength(0);
    });
  });
});

// ============================================================================
// Phase 3: Pre-Startup Detection Tests
// ============================================================================

describe('inferPreStartupFromText', () => {
  it('should detect "예비창업자"', () => {
    const text = '강원특별자치도 내 로컬벤처기업 또는 예비창업자로 사업을 추진하고자 하는 자';
    expect(inferPreStartupFromText(text)).toBe(true);
  });

  it('should detect "예비창업가"', () => {
    const text = '창업기: 2025년 1월 창업 ~ 예비창업가';
    expect(inferPreStartupFromText(text)).toBe(true);
  });

  it('should detect "사업자등록증 발급 가능"', () => {
    const text = '2026. 9월까지 본인을 대표로 하는 사업자등록증 발급이 가능한 자';
    expect(inferPreStartupFromText(text)).toBe(true);
  });

  it('should detect "예비 창업"', () => {
    expect(inferPreStartupFromText('예비 창업 지원')).toBe(true);
  });

  it('should return false when no pre-startup keywords', () => {
    expect(inferPreStartupFromText('기존 사업자 대상 지원')).toBe(false);
    expect(inferPreStartupFromText('중소기업 R&D 지원')).toBe(false);
  });
});

// ============================================================================
// Phase 4: Support Amount Extraction Tests
// ============================================================================

describe('extractSupportAmountFromText', () => {
  describe('Pattern: N,NNN만원', () => {
    it('should extract 2,000만원 as 20,000,000', () => {
      const text = '창업기/도약기: 2,000만원 / 정착기: 3,000만원';
      const result = extractSupportAmountFromText(text);
      expect(result.minAmount).toBe(20_000_000);
      expect(result.maxAmount).toBe(30_000_000);
    });

    it('should extract 1,500만원', () => {
      const result = extractSupportAmountFromText('지원금 최대 1,500만원');
      expect(result.maxAmount).toBe(15_000_000);
    });
  });

  describe('Pattern: N천만원', () => {
    it('should extract 3천만원 as 30,000,000', () => {
      const result = extractSupportAmountFromText('최대 3천만원 지원');
      expect(result.maxAmount).toBe(30_000_000);
    });

    it('should extract 5천만원', () => {
      const result = extractSupportAmountFromText('기업당 5천만원');
      expect(result.maxAmount).toBe(50_000_000);
    });
  });

  describe('Pattern: N억원', () => {
    it('should extract 5억원 as 500,000,000', () => {
      const result = extractSupportAmountFromText('최대 5억원 지원');
      expect(result.maxAmount).toBe(500_000_000);
    });

    it('should extract 1.5억원', () => {
      const result = extractSupportAmountFromText('과제당 1.5억원');
      expect(result.maxAmount).toBe(150_000_000);
    });
  });

  describe('Multiple amounts', () => {
    it('should find min and max from multiple amounts', () => {
      const text = '지원금 (창업기, 도약기 : 2,000 만원 / 정착기 : 3,000 만원) 우수기업 추가지원금 2,000만원';
      const result = extractSupportAmountFromText(text);
      expect(result.minAmount).toBe(20_000_000);
      expect(result.maxAmount).toBe(30_000_000);
    });
  });

  describe('No amount found', () => {
    it('should return nulls when no amount pattern matches', () => {
      const result = extractSupportAmountFromText('지원 내용 추후 안내');
      expect(result.minAmount).toBeNull();
      expect(result.maxAmount).toBeNull();
    });
  });
});
