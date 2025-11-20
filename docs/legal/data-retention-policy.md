# 데이터 보관 및 파기 정책 (Data Retention and Deletion Policy)

**Connect 플랫폼 | PIPA 준수 데이터 보관·파기 정책**

**최종 업데이트: 2025년 11월 20일**
**시행일자: 2025년 11월 20일**

---

## 목차

1. [정책 개요](#1-정책-개요)
2. [데이터 분류 및 보관 기준](#2-데이터-분류-및-보관-기준)
3. [회원 탈퇴 시 데이터 파기 프로세스](#3-회원-탈퇴-시-데이터-파기-프로세스)
4. [법령 보관 의무 데이터](#4-법령-보관-의무-데이터)
5. [데이터 파기 방법](#5-데이터-파기-방법)
6. [백업 데이터 관리](#6-백업-데이터-관리)
7. [데이터 파기 감사 추적](#7-데이터-파기-감사-추적)
8. [책임 및 연락처](#8-책임-및-연락처)

---

## 1. 정책 개요

### 1.1 목적

본 정책은 개인정보 보호법(PIPA) 제21조 및 전자상거래법 제6조에 따라 Connect 플랫폼에서 수집·보관하는 개인정보 및 사용자 데이터의 보관 기간, 파기 절차, 파기 방법을 명확히 규정함으로써:

- **정보주체의 권리 보호** - 불필요한 개인정보의 장기 보관 방지
- **법적 의무 준수** - 법령상 보관 의무가 있는 정보의 적법한 관리
- **데이터 최소화 원칙 실현** - 필요 최소한의 개인정보만 보유

### 1.2 적용 범위

본 정책은 Connect 플랫폼이 처리하는 모든 개인정보 및 사용자 데이터에 적용됩니다:

- **회원 정보**: 이름, 이메일, OAuth 연동 정보
- **조직 정보**: 조직명, 사업자등록번호, 주소, 연락처, 연구개발 역량
- **서비스 이용 기록**: 로그인 기록, 페이지뷰, 매칭 결과, 피드백
- **결제 정보**: 구독 내역, 거래 기록, 결제 방법
- **시스템 로그**: 접속 IP, 세션 기록, 오류 로그

### 1.3 법적 근거

- **개인정보 보호법** 제21조 (개인정보의 파기)
- **전자상거래 등에서의 소비자보호에 관한 법률** 제6조 (거래기록의 보존 등)
- **통신비밀보호법** 제15조의2 (통신사실확인자료 제공)
- **국세기본법** 제85조의3 (장부 등의 비치 및 보존)

---

## 2. 데이터 분류 및 보관 기준

Connect는 데이터의 특성과 법적 요구사항에 따라 다음과 같이 분류하고 관리합니다.

### 2.1 즉시 파기 데이터 (Tier 1)

**보관 기간**: 회원 탈퇴 시 **즉시 파기**

**대상 데이터**:

| 데이터 항목 | 저장 위치 | 파기 방법 |
|-----------|---------|---------|
| **회원 계정 정보** | PostgreSQL `users` 테이블 | `DELETE` 쿼리 + VACUUM |
| - 이름, 이메일 | | 트랜잭션 처리 |
| - OAuth 연동 정보 (provider, providerId) | | 즉시 삭제 |
| - 프로필 이미지 URL | | |
| **조직 프로필 정보** | PostgreSQL `org_profiles` 테이블 | `DELETE` 쿼리 (CASCADE) |
| - 조직명, 사업자등록번호 (암호화) | | 외래 키 제약으로 자동 삭제 |
| - 주소, 연락처, 이메일 | | |
| - 연구개발 역량 정보 | | |
| **세션 데이터** | Redis | `DEL` 명령어 |
| - 세션 토큰 | Key: `session:{sessionToken}` | 즉시 삭제 |
| - 활성 사용자 추적 | Key: `active_users:{date}` | SREM 명령어 |
| **업로드 파일** | 파일 시스템 / S3 | 물리적 삭제 |
| - 조직 로고 이미지 | `/uploads/logos/{userId}/` | `rm -f` 또는 S3 DELETE |

**파기 시점**: 회원 탈퇴 요청 후 **30초 이내** (시스템 자동 처리)

**법적 근거**: 개인정보 보호법 제21조 제1항 (목적 달성 시 지체 없이 파기)

---

### 2.2 30일 보관 후 파기 데이터 (Tier 2)

**보관 기간**: 회원 탈퇴 후 **30일**

**보관 목적**:
- **분쟁 해결**: 서비스 이용 관련 분쟁이 발생할 경우 증빙 자료로 활용
- **부정 사용 방지**: 재가입을 통한 무료 체험 남용 방지
- **서비스 개선**: 비식별화 처리 후 통계 분석

**대상 데이터**:

| 데이터 항목 | 비식별화 처리 | 저장 위치 | 파기 방법 |
|-----------|------------|---------|---------|
| **매칭 결과** | ✅ 사용자 ID → 해시값 | `archived_matches` | 30일 후 자동 삭제 (cron) |
| - 추천 과제 수, 매칭 점수 | ✅ 조직명 → 마스킹 | 별도 보관 테이블 | |
| **피드백 데이터** | ✅ 사용자 ID → 익명 ID | `archived_feedback` | 30일 후 자동 삭제 |
| - 서비스 개선 제안 | ✅ 개인정보 제거 | 별도 보관 테이블 | |
| **거래 기록 (요약)** | ✅ 카드 번호 → 마스킹 | `archived_transactions` | 30일 후 자동 삭제 |
| - 구독 플랜, 결제 금액 | ✅ 이름 → 익명화 | 별도 보관 테이블 | |

**비식별화 처리 방법**:
```typescript
// 예시: 사용자 ID → SHA-256 해시
userId: 'cm3lfkc9d0000xmpa5uuu6xyx' → Hash: 'a3f8b9c2...'

// 예시: 조직명 마스킹
orgName: '㈜삼성전자' → '㈜삼성**'

// 예시: 이메일 마스킹
email: 'paul@example.com' → 'p***@example.com'
```

**자동 파기 스케줄**:
- **cron job**: 매일 오전 3시 (KST) 실행
- **실행 명령**: `node scripts/cleanup-archived-data.js`
- **파기 대상**: `deletedAt` 필드가 30일 이상 경과한 레코드

**법적 근거**: 전자상거래법 제6조 제2항 (소비자의 동의가 있거나 분쟁 해결을 위해 필요한 경우)

---

### 2.3 법령 보관 의무 데이터 (Tier 3)

**보관 목적**: 법령상 의무 이행 (세무, 감사, 소송 대응)

**특징**:
- ✅ **별도 데이터베이스 격리 보관** (접근 제한)
- ✅ **암호화 저장** (AES-256-GCM)
- ✅ **접근 로그 기록** (누가, 언제, 무엇을 조회했는지 감사 추적)
- ✅ **자동 파기** (보관 기간 만료 시 cron job으로 자동 삭제)

**대상 데이터 및 보관 기간**:

| 데이터 항목 | 보관 기간 | 법적 근거 | 저장 위치 |
|-----------|---------|---------|---------|
| **계약 또는 청약철회 기록** | 5년 | 전자상거래법 제6조 | `legal_archived_contracts` |
| - 구독 계약 내용 | | | 별도 보관 DB |
| - 약관 동의 내역 | | | (읽기 전용) |
| **대금결제 및 재화 공급 기록** | 5년 | 전자상거래법 제6조 | `legal_archived_payments` |
| - 결제 금액, 결제 방법 | | 국세기본법 제85조의3 | 별도 보관 DB |
| - 세금계산서 발행 내역 | | | (암호화 저장) |
| **소비자 불만/분쟁 처리 기록** | 3년 | 전자상거래법 제6조 | `legal_archived_disputes` |
| - 고객 문의 내역 | | | 별도 보관 DB |
| - 환불 요청 및 처리 결과 | | | |
| **표시·광고 기록** | 6개월 | 전자상거래법 제6조 | `legal_archived_marketing` |
| - 이메일 마케팅 발송 내역 | | | 별도 보관 DB |
| - 프로모션 안내 기록 | | | |
| **서비스 방문 기록 (로그)** | 3개월 | 통신비밀보호법 제15조의2 | `legal_archived_logs` |
| - 접속 IP 주소 | | | 별도 로그 DB |
| - 접속 시간, 이용 페이지 | | | (WORM 스토리지) |
| **부정 이용 기록** | 5년 | 내부 방침 (재발 방지) | `legal_archived_fraud` |
| - 계정 정지 사유 | | | 별도 보관 DB |
| - 부정 행위 증빙 자료 | | | |

**접근 권한**:
- ✅ **DPO (개인정보 보호책임자)**: 전체 접근 가능
- ✅ **법무팀**: 소송/감사 대응 시 접근 가능
- ✅ **재무팀**: 세무 감사 시 결제 기록만 접근 가능
- ❌ **일반 직원**: 접근 불가

**자동 파기 스케줄**:
- **cron job**: 매월 1일 오전 4시 (KST) 실행
- **실행 명령**: `node scripts/cleanup-legal-archived-data.js`
- **파기 대상**: 보관 기간 만료된 데이터 (예: 5년 경과한 결제 기록)

---

### 2.4 영구 보관 데이터 (Tier 4)

**보관 기간**: **무기한** (비식별화 처리)

**보관 목적**: 서비스 품질 개선, 통계 분석, 연구 개발

**대상 데이터**:

| 데이터 항목 | 비식별화 처리 | 저장 위치 |
|-----------|------------|---------|
| **플랫폼 통계 데이터** | ✅ 개인정보 완전 제거 | `platform_analytics` |
| - 일일 활성 사용자 수 (DAU) | ✅ 집계 데이터만 보관 | 통계 전용 DB |
| - 월간 신규 가입자 수 (MoM) | | |
| - 평균 세션 시간 | | |
| **서비스 성능 지표** | ✅ 개인정보 제거 | `service_performance` |
| - API 응답 시간 | ✅ IP → 지역 단위로 집계 | 모니터링 DB |
| - 오류 발생 비율 | | |
| - 서버 가동 시간 (Uptime) | | |
| **비식별화된 연구 데이터** | ✅ k-익명성 보장 (k≥5) | `research_datasets` |
| - 산업별 R&D 과제 선호도 | ✅ 개인 식별 불가능 | 연구 전용 DB |
| - 조직 유형별 매칭 성공률 | | |

**비식별화 검증 절차**:
1. **가명처리**: 직접 식별자 제거 (이름, 이메일, 사업자등록번호 등)
2. **총계처리**: 집계 데이터로 변환 (개별 기록 → 통계 값)
3. **데이터 삭제**: 간접 식별자 제거 (성별, 나이, 지역을 조합하면 식별 가능한 정보)
4. **k-익명성 검증**: 동일한 속성을 가진 레코드가 최소 5개 이상 존재하는지 확인

**법적 근거**: 개인정보 보호법 제3조 제7항 (익명정보는 개인정보 보호법 적용 제외)

---

## 3. 회원 탈퇴 시 데이터 파기 프로세스

### 3.1 전체 프로세스 개요

```
┌────────────────────────────────────────────────────────┐
│  Step 1: 회원 탈퇴 요청 (5단계 확인)                  │
├────────────────────────────────────────────────────────┤
│  Step 2: 구독 해지 처리 (활성 구독이 있는 경우)       │
├────────────────────────────────────────────────────────┤
│  Step 3: 즉시 파기 데이터 삭제 (Tier 1)               │
│  - PostgreSQL: users, org_profiles, sessions 등       │
│  - Redis: 세션, 활성 사용자 추적                      │
│  - 파일 시스템: 업로드 파일                           │
├────────────────────────────────────────────────────────┤
│  Step 4: 30일 보관 데이터 아카이브 (Tier 2)           │
│  - 비식별화 처리 후 별도 테이블로 이동                │
│  - deletedAt 필드 기록 (30일 후 자동 파기 기준)      │
├────────────────────────────────────────────────────────┤
│  Step 5: 법령 보관 데이터 격리 (Tier 3)               │
│  - 별도 데이터베이스로 이동                           │
│  - 암호화 저장 + 접근 로그 기록                       │
├────────────────────────────────────────────────────────┤
│  Step 6: 파기 완료 로그 생성 (감사 추적)              │
│  - 누가, 언제, 무엇을 삭제했는지 기록                 │
│  - 이메일 통지 (선택한 경우)                          │
└────────────────────────────────────────────────────────┘
```

### 3.2 코드 구현 예시

**파일**: `/app/api/users/withdraw/route.ts`

```typescript
// Step 3: 즉시 파기 데이터 삭제 (Tier 1)
await prisma.user.delete({
  where: { id: user.id },
  // Cascade 설정으로 연관 테이블 자동 삭제:
  // - org_profiles (ON DELETE CASCADE)
  // - sessions (ON DELETE CASCADE)
  // - subscriptions (비활성 상태만)
});

// Redis 세션 삭제
await redis.del(`session:${sessionToken}`);
await redis.sRem(`active_users:${today}`, user.id);

// 파일 삭제
await deleteUserFiles(user.id);

// Step 4: 30일 보관 데이터 아카이브 (Tier 2)
await prisma.archived_matches.createMany({
  data: user.matches.map(m => ({
    ...anonymize(m),  // 비식별화 처리
    deletedAt: new Date(),  // 30일 후 파기 기준
  })),
});

// Step 5: 법령 보관 데이터 격리 (Tier 3)
await prisma.legal_archived_payments.createMany({
  data: user.payments.map(p => ({
    ...encrypt(p),  // 암호화 처리
    archivedAt: new Date(),
    expiresAt: addYears(new Date(), 5),  // 5년 후 자동 파기
  })),
});

// Step 6: 감사 로그 생성
await prisma.audit_logs.create({
  data: {
    action: 'USER_WITHDRAWAL',
    userId: user.id,
    email: user.email,
    deletedAt: new Date(),
    deletedDataTiers: ['Tier1', 'Tier2', 'Tier3'],
  },
});
```

### 3.3 파기 소요 시간

| 단계 | 소요 시간 | 비고 |
|-----|---------|-----|
| Step 1-2 | 1-2분 | 사용자 입력 시간 |
| Step 3 (즉시 파기) | 5-10초 | PostgreSQL 트랜잭션 |
| Step 4 (아카이브) | 3-5초 | 비식별화 처리 |
| Step 5 (법령 보관) | 2-3초 | 암호화 처리 |
| Step 6 (로그 생성) | 1초 | 감사 로그 기록 |
| **총 소요 시간** | **30초 이내** | 시스템 자동 처리 |

---

## 4. 법령 보관 의무 데이터

### 4.1 보관 의무 법령 요약

| 법령 | 조항 | 보관 대상 | 보관 기간 |
|-----|-----|---------|---------|
| 전자상거래법 | 제6조 제1항 | 계약 또는 청약철회 기록 | 5년 |
| 전자상거래법 | 제6조 제2항 | 대금결제 및 재화 공급 기록 | 5년 |
| 전자상거래법 | 제6조 제3항 | 소비자 불만/분쟁 처리 기록 | 3년 |
| 전자상거래법 | 제6조 제4항 | 표시·광고 기록 | 6개월 |
| 통신비밀보호법 | 제15조의2 | 통신사실확인자료 (로그 기록) | 3개월 |
| 국세기본법 | 제85조의3 | 세금계산서 등 장부 | 5년 |

### 4.2 별도 격리 저장 구조

**데이터베이스 스키마**:

```prisma
// 법령 보관 전용 데이터베이스 (legal_archive_db)
model LegalArchivedPayment {
  id              String   @id @default(uuid())

  // 원본 데이터 (암호화)
  encryptedData   String   // AES-256-GCM 암호화

  // 메타데이터
  originalUserId  String   // 원본 사용자 ID (해시 처리)
  archivedAt      DateTime @default(now())
  expiresAt       DateTime // 자동 파기 시점 (5년 후)

  // 법적 근거
  legalBasis      String   // "전자상거래법 제6조"
  retentionYears  Int      @default(5)

  // 접근 로그
  accessLogs      LegalAccessLog[]

  @@index([expiresAt])  // 자동 파기용 인덱스
  @@map("legal_archived_payments")
}

// 접근 로그 (누가, 언제, 왜 조회했는지 감사 추적)
model LegalAccessLog {
  id              String   @id @default(uuid())
  archivedDataId  String
  archivedData    LegalArchivedPayment @relation(fields: [archivedDataId], references: [id])

  accessedBy      String   // DPO, 법무팀 등
  accessedAt      DateTime @default(now())
  accessReason    String   // "세무 감사 대응", "소송 증빙" 등

  @@map("legal_access_logs")
}
```

### 4.3 자동 파기 스크립트

**파일**: `/scripts/cleanup-legal-archived-data.js`

```javascript
// 매월 1일 오전 4시 (KST) 실행 (cron: 0 4 1 * *)
async function cleanupLegalArchivedData() {
  const today = new Date();

  // 보관 기간 만료된 데이터 조회
  const expiredPayments = await prisma.legalArchivedPayment.findMany({
    where: {
      expiresAt: { lte: today },
    },
  });

  console.log(`[CLEANUP] Found ${expiredPayments.length} expired records`);

  // 파기 실행
  for (const record of expiredPayments) {
    // 1. 감사 로그 생성 (파기 전 기록)
    await prisma.auditLog.create({
      data: {
        action: 'LEGAL_DATA_DESTROYED',
        recordId: record.id,
        legalBasis: record.legalBasis,
        destroyedAt: new Date(),
      },
    });

    // 2. 데이터 삭제
    await prisma.legalArchivedPayment.delete({
      where: { id: record.id },
    });
  }

  console.log(`[CLEANUP] Successfully destroyed ${expiredPayments.length} records`);
}
```

---

## 5. 데이터 파기 방법

### 5.1 전자적 파일 파기 방법

**PostgreSQL 데이터베이스**:
```sql
-- 1. DELETE 쿼리 실행
DELETE FROM users WHERE id = 'user_id';

-- 2. VACUUM 처리 (물리적 삭제)
VACUUM FULL users;
```

**Redis 캐시**:
```bash
# 세션 삭제
DEL session:{sessionToken}

# 활성 사용자 추적 제거
SREM active_users:2025-11-20 {userId}
```

**파일 시스템**:
```bash
# 업로드 파일 삭제 (복구 불가능)
rm -f /uploads/logos/{userId}/*
```

**AWS S3 스토리지**:
```javascript
await s3.deleteObject({
  Bucket: 'connect-uploads',
  Key: `logos/${userId}/profile.jpg`,
});
```

### 5.2 물리적 문서 파기 방법

**종이 문서**:
- ✅ **분쇄기 파쇄**: 크로스 컷(Cross-cut) 방식 (조각 크기: 4mm × 40mm 이하)
- ✅ **소각 처리**: 전문 업체 위탁 (처리 증명서 보관)

**광학 매체 (CD/DVD)**:
- ✅ **물리적 파쇄**: 전문 파쇄 장비 사용
- ✅ **소각 처리**: 전문 업체 위탁

---

## 6. 백업 데이터 관리

### 6.1 백업 정책

**백업 주기**:
- **일일 백업**: 매일 오전 2시 (KST) 실행
- **주간 백업**: 매주 일요일 오전 2시 (KST) 실행
- **월간 백업**: 매월 1일 오전 2시 (KST) 실행

**백업 보관 기간**:
| 백업 유형 | 보관 기간 | 저장 위치 |
|---------|---------|---------|
| 일일 백업 | 7일 | AWS S3 (Standard) |
| 주간 백업 | 4주 | AWS S3 (Infrequent Access) |
| 월간 백업 | 12개월 | AWS S3 Glacier |

### 6.2 백업 데이터 내 개인정보 처리

**회원 탈퇴 시 백업 데이터 처리**:

1. **즉시 파기 불가능** - 백업은 스냅샷 형태로 보관되므로 개별 레코드 삭제 불가
2. **백업 만료 시 자동 삭제** - 백업 보관 기간 만료 시 자동으로 전체 백업 파일 삭제
3. **복원 시 재파기** - 백업 복원 시 탈퇴 회원 데이터는 즉시 재파기 처리

**법적 근거**: 개인정보 보호법 시행령 제16조 (백업 데이터에 대한 예외 인정)

---

## 7. 데이터 파기 감사 추적

### 7.1 감사 로그 기록 항목

**기록 내용**:
```typescript
interface AuditLog {
  id: string;                // 로그 고유 ID
  action: string;            // 'USER_WITHDRAWAL', 'DATA_DESTROYED', 'LEGAL_DATA_ARCHIVED'
  userId: string;            // 대상 사용자 ID
  email: string;             // 대상 사용자 이메일
  performedBy: string;       // 작업 수행자 (시스템 자동 = 'SYSTEM')
  performedAt: DateTime;     // 작업 시각
  deletedDataTiers: string[]; // 파기된 데이터 계층 ['Tier1', 'Tier2']
  ipAddress: string;         // 요청 IP 주소
  userAgent: string;         // 브라우저 정보
}
```

### 7.2 감사 로그 보관 기간

- **보관 기간**: **5년** (법령 보관 의무와 동일)
- **저장 위치**: `audit_logs` 테이블 (별도 보관 DB)
- **접근 권한**: DPO, 법무팀만 조회 가능
- **파기 방법**: 5년 경과 시 자동 삭제 (cron job)

---

## 8. 책임 및 연락처

### 8.1 개인정보 보호책임자 (DPO)

```
성명: [미정]
직책: 개인정보 보호책임자 (Chief Privacy Officer)
이메일: privacy@connectplt.kr
전화: [미정]
```

### 8.2 데이터 파기 관련 문의

**이메일**: privacy@connectplt.kr
**제목**: [데이터 파기 문의] {문의 내용}

**처리 기한**: 문의 접수 후 **7일 이내** 회신

---

## 부칙

### 제1조 (시행일)
이 정책은 2025년 11월 20일부터 시행됩니다.

### 제2조 (경과 조치)
이 정책 시행 전에 수집된 개인정보에 대해서도 본 정책을 적용합니다.

### 제3조 (정책 개정)
본 정책은 법령 개정 또는 내부 방침 변경 시 개정될 수 있으며, 개정 시 개인정보 처리방침과 동일한 절차로 공지합니다.

---

**Connect 플랫폼**
**Korea's R&D Commercialization Operating System**
**이메일**: privacy@connectplt.kr
**홈페이지**: https://connectplt.kr
