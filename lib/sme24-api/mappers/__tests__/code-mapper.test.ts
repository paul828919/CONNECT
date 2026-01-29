/**
 * Unit tests for code-mapper.ts
 * Focus: extractRegionFromTitle() enhanced patterns (v2.0)
 */

import { extractRegionFromTitle, hasRegionalIndicatorInTitle } from '../code-mapper';
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
