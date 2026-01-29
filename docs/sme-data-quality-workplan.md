# SME 매칭 데이터 품질 개선 계획서

**작성일**: 2026-01-29
**버전**: 1.1
**상태**: Phase 1-2 완료

---

## 1. 문제 요약

### 1.1 현상
- 사용자 "김병진" (이노웨이브, 부산 소재)의 SME 매칭 결과에서 대구, 전남 등 본인 지역과 관련 없는 지역별 지원사업 공고가 표시됨
- 지역 필터링 버그 수정 후 근본 원인 분석 결과, **API 데이터 품질 문제**로 확인

### 1.2 근본 원인
SME24 API가 **지방정부 프로그램의 자격 요건 데이터를 제공하지 않음**

```
┌─────────────────────────────────────────────────────────────┐
│  SME24 API 데이터 제공 현황 (1,244개 ACTIVE 프로그램 기준)   │
├─────────────────────────────────────────────────────────────┤
│  필드               │ 중앙정부 (586개) │ 지방정부 (658개)   │
├─────────────────────┼──────────────────┼────────────────────┤
│  지역 코드          │      4.1%        │      0.2%          │
│  기업 규모          │     10.9%        │      0.2%          │
│  직원 수            │     10.9%        │      0.2%          │
│  매출액             │     10.9%        │      0.2%          │
│  업력               │      0.2%        │      0.2%          │
│  지원금액           │      0.0%        │      0.0%          │
│  생애주기           │      0.0%        │      0.0%          │
├─────────────────────┼──────────────────┼────────────────────┤
│  description 텍스트 │     95.1%        │     99.7%          │
│  공고문 파일 URL    │     94.9%        │     94.9%          │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 영향
- 전체 프로그램의 **53%를 차지하는 지방정부 프로그램**의 자격 요건 매칭 불가
- 지역 필터링, 기업 규모 필터링 등 핵심 매칭 로직이 작동하지 않음
- 사용자에게 부적합한 프로그램이 "완전 적합"으로 표시되는 UX 문제

---

## 2. 해결 전략: 3-Tier 텍스트 추출 파이프라인

### 2.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                    3-Tier 자격 요건 추출 파이프라인               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tier 1: 규칙 기반 (Zero Cost)                                  │
│  ├─ 제목에서 지역 추출 ("[대구]" → DAEGU) ✅ 구현 완료          │
│  ├─ description에서 기업규모 추출 ("중소기업", "소상공인")       │
│  ├─ description에서 업력 추출 ("창업 7년 미만")                 │
│  ├─ description에서 매출/직원 추출 ("매출 100억 미만")          │
│  └─ description에서 지역 추출 ("부산시 소재 기업")              │
│  예상 커버리지: ~80%                                            │
│                                                                 │
│  Tier 2: Haiku LLM (Low Cost)                                   │
│  ├─ description 텍스트 의미 분석                                │
│  ├─ 복잡한 자격 조건 파싱 ("제조업 중 음식료품 제외")           │
│  └─ 암시적 요건 추론                                            │
│  예상 추가 커버리지: ~15%                                       │
│                                                                 │
│  Tier 3: Opus + 공고문 파싱 (High Cost)                         │
│  ├─ HWP/PDF 공고문 다운로드 및 텍스트 추출                      │
│  ├─ 표/양식에서 구조화된 데이터 추출                            │
│  └─ 복잡한 자격 요건표 파싱                                     │
│  예상 추가 커버리지: ~5%                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 설계 원칙 (Netflix/YouTube 추천 시스템 경험 기반)

1. **다중 신호 융합 (Multi-Signal Fusion)**: 단일 데이터 소스 의존 금지
2. **점진적 품질 향상**: 저비용 추출 먼저, 필요시에만 고비용 LLM
3. **Graceful Degradation**: 추출 실패 시에도 서비스 영향 최소화
4. **배치 처리 최적화**: 실시간이 아닌 배치로 비용 최적화

---

## 3. 실행 계획

### Phase 1: Tier 1 규칙 기반 추출 확장 (우선순위: 긴급)

#### 3.1.1 description에서 지역 추출 (2시간)
**목표**: 지역 커버리지 2.0% → 80%+

**파일**: `lib/sme24-api/mappers/code-mapper.ts`

```typescript
// 추가할 함수
export function extractRegionFromDescription(description: string): KoreanRegion[];
```

**추출 패턴**:
- "부산시 소재 기업" → BUSAN
- "경기도 내 중소기업" → GYEONGGI
- "서울특별시에 본사를 둔" → SEOUL
- "OO시/도 관내" → 해당 지역

#### 3.1.2 description에서 기업규모 추출 (2시간)
**목표**: 규모 커버리지 5.2% → 60%+

**파일**: `lib/sme24-api/mappers/eligibility-text-extractor.ts` (신규)

```typescript
export interface ExtractedEligibility {
  companyScale: string[];      // 중소기업, 소상공인, 예비창업자 등
  minEmployees: number | null;
  maxEmployees: number | null;
  minRevenue: number | null;   // 단위: 억원
  maxRevenue: number | null;
  minBusinessAge: number | null; // 단위: 년
  maxBusinessAge: number | null;
  regions: KoreanRegion[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export function extractEligibilityFromText(
  title: string,
  description: string,
  supportTarget: string
): ExtractedEligibility;
```

**추출 패턴**:
- 기업규모: "중소기업", "소상공인", "예비창업자", "1인기업"
- 직원수: "상시근로자 50인 미만", "종업원 10명 이상"
- 매출액: "매출액 100억 미만", "연매출 50억 이상"
- 업력: "창업 7년 이내", "업력 3년 미만", "설립 5년 이상"

#### 3.1.3 sme-algorithm.ts 통합 (2시간)
**목표**: 추출된 데이터를 매칭 알고리즘에 반영

**수정 파일**: `lib/matching/sme-algorithm.ts`

1. API 데이터 우선 사용
2. API 데이터 없을 시 텍스트 추출 결과 폴백
3. 추출 신뢰도에 따른 가중치 조정

### Phase 2: 배치 처리 및 DB 업데이트 (우선순위: 높음)

#### 3.2.1 SME 프로그램 enrichment 배치 작업 (4시간)

**파일**: `scripts/enrich-sme-programs.ts`

```typescript
/**
 * SME 프로그램 자격 요건 추출 배치 작업
 *
 * 실행: npx tsx scripts/enrich-sme-programs.ts
 *
 * 동작:
 * 1. targetRegionCodes가 비어있는 ACTIVE 프로그램 조회
 * 2. Tier 1 규칙 기반 추출 실행
 * 3. 추출 결과 DB 업데이트
 * 4. 추출 실패 프로그램 로깅 (Tier 2 대상)
 */
```

#### 3.2.2 DB 스키마 확장 (필요시)

```prisma
model sme_programs {
  // 기존 필드...

  // 추출 메타데이터
  eligibilitySource     String?   // 'API' | 'TEXT_TIER1' | 'TEXT_TIER2' | 'DOCUMENT'
  eligibilityConfidence String?   // 'HIGH' | 'MEDIUM' | 'LOW'
  eligibilityExtractedAt DateTime?
}
```

### Phase 3: Tier 2 LLM 추출 (우선순위: 중간)

#### 3.3.1 Tier 1 실패 케이스 분석

Tier 1 규칙으로 추출 실패한 프로그램 패턴 분석 후 Haiku 프롬프트 최적화

#### 3.3.2 기존 sme-enrichment-prompt.ts 확장

- 지역/규모/업력 추출 필드 추가
- 복잡한 조건문 처리 (예: "단, 제조업 중 음식료품 제외")

### Phase 4: Tier 3 공고문 파싱 (우선순위: 낮음)

- 기존 HWP/PDF 파싱 인프라 활용
- `lib/scraping/utils/hancom-docs-converter.ts`
- `lib/scraping/three-tier-extractor.ts`

---

## 4. 수정 대상 파일

| 파일 | 작업 | 우선순위 |
|------|------|---------|
| `lib/sme24-api/mappers/code-mapper.ts` | 지역 추출 함수 확장 | Phase 1 |
| `lib/sme24-api/mappers/eligibility-text-extractor.ts` | 신규 생성 | Phase 1 |
| `lib/matching/sme-algorithm.ts` | 텍스트 추출 결과 통합 | Phase 1 |
| `scripts/enrich-sme-programs.ts` | 배치 작업 신규 생성 | Phase 2 |
| `lib/scraping/sme-enrichment-prompt.ts` | 추출 필드 확장 | Phase 3 |

---

## 5. 검증 방법

### 5.1 단위 테스트
```bash
# 지역 추출 테스트
npx tsx scripts/test-region-extraction.ts

# 자격 요건 추출 테스트
npx tsx scripts/test-eligibility-extraction.ts
```

### 5.2 통합 테스트
```sql
-- 추출 전후 커버리지 비교
SELECT
  'Before' as stage,
  COUNT(*) as total,
  COUNT(CASE WHEN array_length("targetRegionCodes", 1) > 0 THEN 1 END) as with_region
FROM sme_programs WHERE status = 'ACTIVE';
```

### 5.3 매칭 품질 테스트
1. 이노웨이브 (부산) 계정으로 새 매칭 생성
2. 대구/전남 지역 프로그램이 필터링되었는지 확인
3. 부산 지역 프로그램이 정상 매칭되는지 확인

---

## 6. 일정

| 단계 | 작업 | 예상 시간 | 상태 |
|------|------|----------|------|
| Phase 1.1 | description에서 지역 추출 | 2시간 | ✅ 완료 |
| Phase 1.2 | description에서 기업규모/업력 추출 | 2시간 | ✅ 완료 |
| Phase 1.3 | sme-algorithm.ts 통합 | 2시간 | ✅ 완료 |
| Phase 2.1 | 배치 작업 스크립트 | 4시간 | ✅ 완료 |
| Phase 3 | Tier 2 LLM 확장 | 4시간 | ⏳ 대기 |
| Phase 4 | Tier 3 공고문 파싱 | 8시간+ | ⏳ 대기 |

### 실행 결과 (2026-01-29)

```
=== Enrichment Summary ===
Total programs: 1,220
Processed: 1,220
Updated: 1,084 (89%)
Errors: 0

Coverage Improvement:
- Region: 2% → 56.3% (28x improvement)
- Company Scale: 5% → 82.3% (16x improvement)
```

---

## 7. 리스크 및 완화 방안

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 텍스트 추출 정확도 낮음 | 잘못된 필터링 | confidence 레벨에 따른 가중치 조정 |
| 다양한 텍스트 패턴 | 추출 누락 | 패턴 지속 추가, Tier 2 폴백 |
| LLM 비용 증가 | 운영비 증가 | Tier 1 커버리지 최대화, 배치 처리 |

---

## 8. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-01-29 | 최초 작성 |
