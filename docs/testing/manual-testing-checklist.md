# Connect 플랫폼 수동 테스트 체크리스트

**PIPA 준수 회원 탈퇴 및 관리자 통계 시스템 테스트**

**작성일**: 2025년 11월 20일
**테스트 범위**: Session 1-6 (Active User Tracking, Withdrawal System, Admin Statistics)

---

## 목차

1. [테스트 환경 설정](#1-테스트-환경-설정)
2. [Session 1: Active User Tracking 테스트](#2-session-1-active-user-tracking-테스트)
3. [Session 2: Backend API 테스트](#3-session-2-backend-api-테스트)
4. [Session 3: Toss Payments 연동 테스트](#4-session-3-toss-payments-연동-테스트)
5. [Session 4: Frontend Withdrawal UI 테스트](#5-session-4-frontend-withdrawal-ui-테스트)
6. [Session 5: Admin Statistics Dashboard 테스트](#6-session-5-admin-statistics-dashboard-테스트)
7. [보안 테스트](#7-보안-테스트)
8. [성능 테스트](#8-성능-테스트)
9. [브라우저 호환성 테스트](#9-브라우저-호환성-테스트)
10. [테스트 결과 요약](#10-테스트-결과-요약)

---

## 1. 테스트 환경 설정

### 1.1 필수 환경 변수 확인

**파일**: `.env.local` (개발 환경) 또는 `.env.production` (프로덕션)

```bash
# 데이터베이스
DATABASE_URL="postgresql://..."

# Redis
REDIS_CACHE_URL="redis://localhost:6379"

# OAuth (카카오, 네이버)
NEXTAUTH_SECRET="..."
KAKAO_CLIENT_ID="..."
KAKAO_CLIENT_SECRET="..."
NAVER_CLIENT_ID="..."
NAVER_CLIENT_SECRET="..."

# Toss Payments
NEXT_PUBLIC_TOSS_CLIENT_KEY="..."
TOSS_SECRET_KEY="..."

# Encryption
ENCRYPTION_KEY="..." # 32 bytes hex (openssl rand -hex 32)
```

### 1.2 Docker 컨테이너 실행 확인

```bash
# Docker Compose 실행 확인
docker-compose ps

# 예상 출력:
# connect-app-1       running
# connect-db-1        running
# connect-redis-1     running
```

### 1.3 데이터베이스 마이그레이션 확인

```bash
# Prisma 마이그레이션 실행
npx prisma db push

# 테이블 생성 확인
npx prisma studio
# 브라우저에서 http://localhost:5555 접속하여 테이블 확인
```

### 1.4 테스트 계정 준비

| 역할 | 계정 정보 | 비고 |
|-----|---------|-----|
| **일반 사용자** | test-user@example.com | 회원 탈퇴 테스트용 |
| **관리자** | admin@example.com | 통계 대시보드 접근용 |
| **슈퍼 관리자** | super-admin@example.com | 전체 기능 테스트용 |

---

## 2. Session 1: Active User Tracking 테스트

### 2.1 Redis 연결 테스트

**목적**: Redis 연결 및 활성 사용자 추적 확인

**테스트 단계**:

1. ✅ Redis CLI 접속
   ```bash
   redis-cli ping
   # 예상 출력: PONG
   ```

2. ✅ 로그인 후 Redis 키 확인
   ```bash
   # 오늘 날짜 키 확인
   redis-cli SMEMBERS active_users:2025-11-20
   # 예상 출력: 사용자 ID 리스트
   ```

3. ✅ 페이지 뷰 카운터 확인
   ```bash
   redis-cli GET page_views:2025-11-20
   # 예상 출력: 숫자 (예: "42")
   ```

**예상 결과**:
- [ ] Redis 연결 성공
- [ ] 로그인 시 `active_users:{date}` Set에 사용자 ID 추가됨
- [ ] 페이지 이동 시 `page_views:{date}` 카운터 증가함

---

### 2.2 Cron Job 집계 테스트

**목적**: 매시간 활성 사용자 통계 집계 확인

**테스트 단계**:

1. ✅ 수동으로 집계 함수 실행
   ```bash
   # 집계 스크립트 실행
   npx tsx lib/analytics/active-user-tracking.ts
   ```

2. ✅ 데이터베이스 확인
   ```bash
   npx prisma studio
   # active_user_stats 테이블 확인
   ```

**예상 결과**:
- [ ] `active_user_stats` 테이블에 오늘 날짜 레코드 생성됨
- [ ] `uniqueUsers` 필드에 Redis의 Set 크기 반영됨
- [ ] `totalPageViews` 필드에 Redis의 카운터 값 반영됨

---

## 3. Session 2: Backend API 테스트

### 3.1 데이터 내보내기 API 테스트

**목적**: `/api/users/export-data` 엔드포인트 테스트

**테스트 단계**:

1. ✅ **인증 없이 요청 (401 예상)**
   ```bash
   curl -X GET http://localhost:3000/api/users/export-data
   # 예상: {"error": "Unauthorized"}
   ```

2. ✅ **로그인 후 요청 (200 예상)**
   ```bash
   # 브라우저에서 로그인 후 개발자 도구 > Network 탭에서 확인
   # 또는 Postman으로 세션 쿠키 포함하여 요청
   ```

3. ✅ **CSV 파일 다운로드 확인**
   - 파일명: `connect-data-export-{userId}-{timestamp}.csv`
   - Content-Type: `text/csv; charset=utf-8`
   - UTF-8 BOM 포함 확인 (Excel에서 한글 정상 표시)

4. ✅ **CSV 내용 확인**
   ```csv
   ===== 회원 정보 =====
   이름,홍길동
   이메일,test@example.com
   가입일,2025-11-20

   ===== 조직 정보 =====
   조직명,테스트 주식회사
   ...
   ```

5. ✅ **Rate Limiting 테스트 (1시간 1회 제한)**
   - 첫 번째 요청: 200 OK
   - 두 번째 요청 (1분 후): 429 Too Many Requests
   - 응답 메시지: `{ "error": "...", "resetTime": "2025-11-20T11:00:00Z" }`

**예상 결과**:
- [ ] 인증 없는 요청은 401 Unauthorized 반환
- [ ] 인증된 사용자는 CSV 다운로드 성공
- [ ] CSV 파일이 UTF-8 BOM 포함 (Excel 호환)
- [ ] Rate Limiting이 정상 작동 (1시간 1회)

---

### 3.2 회원 탈퇴 API 테스트

**목적**: `/api/users/withdraw` 엔드포인트 테스트

**테스트 단계**:

1. ✅ **인증 없이 요청 (401 예상)**
   ```bash
   curl -X POST http://localhost:3000/api/users/withdraw
   # 예상: {"error": "Unauthorized"}
   ```

2. ✅ **필수 필드 누락 (400 예상)**
   ```bash
   curl -X POST http://localhost:3000/api/users/withdraw \
     -H "Content-Type: application/json" \
     -d '{"confirmation": false}'
   # 예상: {"error": "Confirmation required"}
   ```

3. ✅ **정상 탈퇴 요청 (200 예상)**
   ```bash
   curl -X POST http://localhost:3000/api/users/withdraw \
     -H "Content-Type: application/json" \
     -d '{
       "reason": "서비스 불만족",
       "confirmation": true
     }'
   # 예상: {"success": true, "message": "..."}
   ```

4. ✅ **데이터베이스 확인 (데이터 삭제 검증)**
   ```bash
   npx prisma studio
   # users 테이블에서 탈퇴한 사용자 확인 (삭제되었는지)
   # archived_* 테이블에서 30일 보관 데이터 확인
   ```

5. ✅ **Redis 확인 (세션 삭제 검증)**
   ```bash
   redis-cli KEYS session:*
   # 탈퇴한 사용자의 세션 키가 삭제되었는지 확인
   ```

**예상 결과**:
- [ ] 인증 없는 요청은 401 Unauthorized 반환
- [ ] 필수 필드 누락 시 400 Bad Request 반환
- [ ] 정상 요청 시 200 OK 반환 및 데이터 삭제 완료
- [ ] PostgreSQL에서 사용자 레코드 삭제 확인
- [ ] Redis에서 세션 키 삭제 확인
- [ ] 30일 보관 데이터는 `archived_*` 테이블에 이동 확인

---

## 4. Session 3: Toss Payments 연동 테스트

### 4.1 구독 해지 프로세스 테스트

**목적**: Toss Payments 구독 해지 API 연동 확인

**테스트 단계**:

1. ✅ **활성 구독이 있는 사용자 탈퇴 시도**
   - 대시보드 > 설정 > 회원 탈퇴 이동
   - "활성 구독이 있습니다" 경고 메시지 확인

2. ✅ **구독 해지 API 호출 확인**
   ```bash
   # 서버 로그 확인
   docker-compose logs -f app | grep "SUBSCRIPTION"
   # 예상: [SUBSCRIPTION] Canceling subscription for user {userId}
   ```

3. ✅ **Toss Payments API 응답 확인**
   ```bash
   # 서버 로그에서 Toss API 응답 확인
   # 예상: [TOSS] Subscription canceled successfully: {billingKey}
   ```

4. ✅ **데이터베이스 상태 업데이트 확인**
   ```bash
   npx prisma studio
   # subscriptions 테이블에서 status: 'CANCELED', canceledAt: 현재 시각 확인
   ```

**예상 결과**:
- [ ] 활성 구독이 있는 사용자는 탈퇴 전 구독 해지 필요
- [ ] Toss Payments API 호출 성공 (200 OK)
- [ ] 데이터베이스에 구독 상태 업데이트 (`CANCELED`)
- [ ] 구독 해지 후 탈퇴 프로세스 진행 가능

---

## 5. Session 4: Frontend Withdrawal UI 테스트

### 5.1 5단계 회원 탈퇴 프로세스 테스트

**목적**: 사용자 친화적인 탈퇴 UI 확인

**테스트 단계**:

#### Step 1: 탈퇴 사유 입력

1. ✅ 대시보드 > 설정 > 회원 탈퇴 메뉴 접근
2. ✅ 5가지 탈퇴 사유 옵션 표시 확인
   - 서비스 불만족
   - 사용 빈도 낮음
   - 더 나은 대안 발견
   - 개인정보 보호 우려
   - 기타 (직접 입력)
3. ✅ "기타" 선택 시 텍스트 영역 표시 확인
4. ✅ "다음 단계" 버튼 활성화 확인

**예상 결과**:
- [ ] 탈퇴 사유 선택 UI 정상 표시
- [ ] "기타" 선택 시 자유 입력 필드 표시
- [ ] 다음 단계 버튼 클릭 시 Step 2로 이동

---

#### Step 2: 주의사항 확인

1. ✅ 경고 메시지 표시 확인
   - "모든 데이터가 삭제됩니다"
   - "30일 이내 복구 불가능"
   - "활성 구독은 즉시 해지됩니다"
2. ✅ 체크박스 동의 확인
   - "위 내용을 모두 확인했으며 동의합니다"
3. ✅ 동의하지 않으면 다음 단계 버튼 비활성화 확인

**예상 결과**:
- [ ] 경고 메시지가 명확하게 표시됨
- [ ] 체크박스 동의 필수
- [ ] 동의 후에만 다음 단계 버튼 활성화

---

#### Step 3: 구독 해지 처리

**Case A: 활성 구독이 없는 경우**

1. ✅ "활성 구독이 없습니다" 메시지 표시
2. ✅ 자동으로 Step 4로 이동

**Case B: 활성 구독이 있는 경우**

1. ✅ 구독 정보 카드 표시
   - 구독 플랜명: "Pro Plan"
   - 월 결제 금액: ₩990,000
   - 다음 결제일: 2025-12-01
2. ✅ "구독 해지" 버튼 클릭
3. ✅ 로딩 스피너 표시
4. ✅ 해지 성공 토스트 메시지 표시
5. ✅ Step 4로 자동 이동

**예상 결과**:
- [ ] 활성 구독 유무에 따라 UI 분기 처리
- [ ] 구독 해지 API 호출 성공
- [ ] 해지 후 자동으로 다음 단계 진행

---

#### Step 4: 최종 확인

1. ✅ 인증 방법 선택
   - Option A: 비밀번호 입력 (소셜 로그인 제외)
   - Option B: SMS 인증 코드 (모든 사용자)
2. ✅ 비밀번호 입력 필드 표시 (OAuth 사용자는 비활성화)
3. ✅ "SMS 인증" 버튼 클릭 시 인증 코드 발송
4. ✅ 인증 코드 6자리 입력 필드 표시
5. ✅ "회원 탈퇴" 버튼 클릭

**예상 결과**:
- [ ] 소셜 로그인 사용자는 SMS 인증만 가능
- [ ] 비밀번호 입력 시 즉시 검증
- [ ] SMS 인증 코드 발송 성공 (토스트 메시지)
- [ ] 인증 완료 후 탈퇴 버튼 활성화

---

#### Step 5: 탈퇴 완료

1. ✅ 로딩 스피너 표시 (최대 10초)
2. ✅ 성공 메시지 표시
   - "회원 탈퇴가 완료되었습니다"
   - "그동안 Connect를 이용해 주셔서 감사합니다"
3. ✅ 3초 후 자동으로 홈페이지로 리다이렉트
4. ✅ 로그인 페이지 접근 시 "계정이 삭제되었습니다" 메시지 표시

**예상 결과**:
- [ ] 탈퇴 완료 메시지 표시
- [ ] 자동 로그아웃 및 홈페이지 리다이렉트
- [ ] 재로그인 시도 시 "계정 없음" 오류 표시

---

## 6. Session 5: Admin Statistics Dashboard 테스트

### 6.1 대시보드 접근 권한 테스트

**목적**: 관리자만 통계 대시보드 접근 가능 확인

**테스트 단계**:

1. ✅ **일반 사용자 접근 시도 (403 예상)**
   - 일반 사용자로 로그인
   - `/dashboard/admin/statistics` URL 직접 접근
   - 예상: "관리자 권한이 필요합니다" 메시지 표시 또는 403 Forbidden

2. ✅ **관리자 접근 (200 예상)**
   - 관리자 계정으로 로그인
   - UserMenu 드롭다운에서 "사용자 통계" 메뉴 항목 확인
   - 클릭 시 대시보드 정상 표시

3. ✅ **슈퍼 관리자 접근 (200 예상)**
   - 슈퍼 관리자 계정으로 로그인
   - 동일하게 접근 가능

**예상 결과**:
- [ ] 일반 사용자는 접근 불가 (403 Forbidden)
- [ ] 관리자와 슈퍼 관리자는 접근 가능
- [ ] UserMenu에 "사용자 통계" 메뉴 항목 표시 (관리자만)

---

### 6.2 KPI 카드 데이터 표시 테스트

**목적**: 4개의 KPI 카드 데이터 정확성 확인

**테스트 단계**:

1. ✅ **총 사용자 카드**
   - 표시 값: 예) 1,250명
   - 기간: 2025-10-21 ~ 2025-11-20
   - 아이콘: Users (파란색)

2. ✅ **평균 일일 사용자 카드**
   - 표시 값: 예) 41.7명
   - 트렌드 배지: "12.5% 증가" (녹색) 또는 "5.3% 감소" (빨간색)
   - 아이콘: Activity (녹색)

3. ✅ **최고 사용자 카드**
   - 표시 값: 예) 65명
   - 최고 기록일: 2025-11-15
   - 아이콘: TrendingUp (보라색)

4. ✅ **평균 페이지뷰/사용자 카드**
   - 표시 값: 예) 7.1
   - 총 페이지뷰: 8,900
   - 아이콘: Eye (주황색)

**예상 결과**:
- [ ] 모든 KPI 카드가 정상적으로 표시됨
- [ ] 숫자 값이 천 단위 콤마로 포맷팅됨 (예: 1,250)
- [ ] 트렌드 배지가 올바른 색상과 아이콘으로 표시됨

---

### 6.3 실시간 통계 카드 테스트

**목적**: 오늘의 실시간 통계 표시 확인

**테스트 단계**:

1. ✅ 실시간 통계 카드 표시 확인
   - 제목: "실시간 통계 (오늘)"
   - 아이콘: Activity (파란색, 펄스 애니메이션)

2. ✅ 오늘의 활성 사용자 수 확인
   - Redis에서 가져온 데이터 (집계 전)
   - 예상 값: 현재 로그인한 사용자 수

3. ✅ 오늘의 페이지뷰 수 확인
   - Redis 카운터 값
   - 예상 값: 오늘 발생한 총 페이지뷰

4. ✅ 마지막 업데이트 시각 확인
   - 예) "마지막 업데이트: 2025-11-20 오후 2:30"

**예상 결과**:
- [ ] 실시간 통계 카드가 파란색 배경으로 표시됨
- [ ] Activity 아이콘이 펄스 애니메이션 효과로 표시됨
- [ ] 오늘의 활성 사용자와 페이지뷰가 정확하게 표시됨

---

### 6.4 AreaChart (활성 사용자 추이) 테스트

**목적**: Recharts AreaChart 정상 렌더링 확인

**테스트 단계**:

1. ✅ 차트 표시 확인
   - 제목: "활성 사용자 추이"
   - 설명: "일별 활성 사용자 수" (기본값)

2. ✅ X축 (날짜) 확인
   - 형식: MM/DD (예: 11/20)
   - 간격: 적절한 간격으로 표시 (Recharts 자동 조정)

3. ✅ Y축 (사용자 수) 확인
   - 최소값: 0
   - 최대값: 데이터 최댓값 + 여유 공간

4. ✅ 그라데이션 색상 확인
   - 상단: 파란색 (#3b82f6, 불투명도 30%)
   - 하단: 파란색 (#3b82f6, 불투명도 0%)

5. ✅ 툴팁 확인
   - 마우스 오버 시 날짜와 사용자 수 표시
   - 예) "2025-11-20: 45명"

**예상 결과**:
- [ ] AreaChart가 정상적으로 렌더링됨
- [ ] 그라데이션 효과가 부드럽게 표시됨
- [ ] 마우스 오버 시 툴팁이 정확한 데이터 표시

---

### 6.5 LineChart (페이지뷰 추이) 테스트

**목적**: 듀얼 Y축 LineChart 정상 렌더링 확인

**테스트 단계**:

1. ✅ 차트 표시 확인
   - 제목: "페이지 뷰 추이"
   - 설명: "일별 페이지 뷰 및 사용자당 평균"

2. ✅ 왼쪽 Y축 (페이지뷰) 확인
   - 선 색상: 녹색 (#10b981)
   - 선 스타일: 실선

3. ✅ 오른쪽 Y축 (평균 페이지뷰/사용자) 확인
   - 선 색상: 주황색 (#f59e0b)
   - 선 스타일: 점선 (5px 간격)

4. ✅ 범례 확인
   - "페이지 뷰" (녹색)
   - "평균 페이지뷰/사용자" (주황색)

5. ✅ 툴팁 확인
   - 두 값이 동시에 표시되는지 확인
   - 예) "2025-11-20: 320 / 7.1"

**예상 결과**:
- [ ] LineChart가 듀얼 Y축으로 정상 렌더링됨
- [ ] 페이지뷰와 평균 engagement가 구분되어 표시됨
- [ ] 범례를 클릭하여 선을 숨기기/표시 가능

---

### 6.6 기간 선택 기능 테스트

**목적**: 일간/주간/월간 탭 전환 확인

**테스트 단계**:

1. ✅ **일간 (Daily) 탭 선택**
   - 기본 선택 상태 확인
   - X축 형식: MM/DD (예: 11/20)
   - 데이터 포인트: 최근 30일

2. ✅ **주간 (Weekly) 탭 선택**
   - 탭 클릭 시 API 재요청 확인 (Network 탭)
   - X축 형식: MM/DD (주 시작일)
   - 데이터 포인트: 최근 12주

3. ✅ **월간 (Monthly) 탭 선택**
   - API 재요청 확인
   - X축 형식: YYYY-MM (예: 2025-11)
   - 데이터 포인트: 최근 12개월

4. ✅ 로딩 상태 확인
   - 탭 전환 시 로딩 스피너 표시
   - "데이터 로딩 중..." 메시지 표시

**예상 결과**:
- [ ] 탭 전환 시 API 재요청 발생
- [ ] 차트 데이터가 선택한 기간에 맞게 업데이트됨
- [ ] 로딩 상태가 명확하게 표시됨

---

### 6.7 CSV 다운로드 기능 테스트

**목적**: 통계 데이터 CSV 내보내기 확인

**테스트 단계**:

1. ✅ "CSV 다운로드" 버튼 클릭
2. ✅ 로딩 스피너 표시 확인
   - 버튼 텍스트: "내보내는 중..."
3. ✅ 파일 다운로드 확인
   - 파일명: `user-statistics-daily-2025-10-21-to-2025-11-20.csv`
4. ✅ CSV 파일 열기 (Excel 또는 텍스트 에디터)
5. ✅ 내용 확인
   ```csv
   날짜,고유 사용자 수,총 페이지 뷰,평균 페이지뷰/사용자
   2025-10-21,45,320,7.11
   2025-10-22,48,352,7.33
   ...

   ===== 요약 통계 =====
   기간,daily
   시작일,2025-10-21
   종료일,2025-11-20
   ...
   ```
6. ✅ 한글 인코딩 확인 (Excel에서 깨지지 않는지)

**예상 결과**:
- [ ] CSV 파일 다운로드 성공
- [ ] 파일명이 기간 정보 포함
- [ ] UTF-8 BOM 포함으로 Excel 호환
- [ ] 요약 통계 섹션 포함

---

### 6.8 자동 새로고침 테스트

**목적**: 60초 간격 자동 데이터 갱신 확인

**테스트 단계**:

1. ✅ 대시보드 열어두기
2. ✅ Network 탭에서 API 요청 모니터링
3. ✅ 60초 후 자동 API 재요청 확인
   - URL: `/api/admin/statistics/users?period=daily`
4. ✅ KPI 카드 데이터 업데이트 확인
5. ✅ "마지막 업데이트" 시각 변경 확인

**예상 결과**:
- [ ] 60초마다 자동으로 API 재요청 발생
- [ ] 데이터가 갱신되어 UI에 반영됨
- [ ] 실시간 통계 카드의 마지막 업데이트 시각 갱신

---

## 7. 보안 테스트

### 7.1 암호화 테스트

**목적**: 사업자등록번호 AES-256-GCM 암호화 확인

**테스트 단계**:

1. ✅ 조직 프로필 생성 시 사업자등록번호 입력
   - 예) 123-45-67890

2. ✅ 데이터베이스 확인
   ```bash
   npx prisma studio
   # org_profiles 테이블에서 businessNumberEncrypted 필드 확인
   ```

3. ✅ 암호화 형식 확인
   - 형식: `iv:authTag:cipherText` (콜론으로 구분된 3개 파트)
   - 예) `a1b2c3d4:e5f6g7h8:i9j0k1l2...`

4. ✅ 해시 값 확인
   - `businessNumberHash` 필드 확인
   - 길이: 64자 (SHA-256 hex)
   - 예) `3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d...`

**예상 결과**:
- [ ] 평문 사업자등록번호는 데이터베이스에 저장되지 않음
- [ ] 암호화된 값이 `iv:authTag:cipherText` 형식으로 저장됨
- [ ] 해시 값이 SHA-256 (64자) 형식으로 저장됨

---

### 7.2 Rate Limiting 테스트

**목적**: API 속도 제한 정상 작동 확인

**테스트 케이스**:

#### 7.2.1 데이터 내보내기 API (1시간 1회)

1. ✅ 첫 번째 요청: 200 OK
2. ✅ 두 번째 요청 (1분 후): 429 Too Many Requests
3. ✅ 응답 메시지 확인
   ```json
   {
     "error": "Too many export requests. Please try again later.",
     "resetTime": "2025-11-20T11:00:00Z",
     "waitSeconds": 3540
   }
   ```

**예상 결과**:
- [ ] 첫 번째 요청 성공
- [ ] 1시간 이내 재요청 시 429 에러 반환
- [ ] `resetTime` 필드에 다음 가능 시각 표시

---

### 7.3 접근 제어 (RBAC) 테스트

**목적**: 역할 기반 접근 제어 확인

**테스트 케이스**:

| 엔드포인트 | USER | ADMIN | SUPER_ADMIN |
|-----------|------|-------|-------------|
| `/api/admin/statistics/users` | ❌ 403 | ✅ 200 | ✅ 200 |
| `/dashboard/admin/statistics` | ❌ 403 | ✅ 200 | ✅ 200 |
| `/api/users/export-data` | ✅ 200 | ✅ 200 | ✅ 200 |
| `/api/users/withdraw` | ✅ 200 | ✅ 200 | ✅ 200 |

**예상 결과**:
- [ ] 일반 사용자는 관리자 API/페이지 접근 불가 (403)
- [ ] 관리자와 슈퍼 관리자는 모든 기능 접근 가능

---

## 8. 성능 테스트

### 8.1 데이터베이스 쿼리 성능

**목적**: 대량 데이터 처리 시 성능 확인

**테스트 시나리오**:

1. ✅ **1,000개 레코드 조회** (30일 일간 데이터)
   - API 응답 시간: < 500ms
   - 쿼리 실행 시간: < 100ms

2. ✅ **10,000개 레코드 조회** (1년 일간 데이터)
   - API 응답 시간: < 2초
   - 쿼리 실행 시간: < 500ms

3. ✅ **인덱스 확인**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM active_user_stats
   WHERE date >= '2025-01-01' AND date <= '2025-11-20'
   ORDER BY date ASC;
   ```
   - 예상: `Index Scan using active_user_stats_date_idx`

**예상 결과**:
- [ ] 30일 데이터 조회 응답 시간 < 500ms
- [ ] 1년 데이터 조회 응답 시간 < 2초
- [ ] `date` 필드에 인덱스 활용 확인

---

### 8.2 프론트엔드 렌더링 성능

**목적**: Recharts 차트 렌더링 성능 확인

**테스트 단계**:

1. ✅ Chrome DevTools > Performance 탭 열기
2. ✅ "Record" 버튼 클릭 후 대시보드 로드
3. ✅ Metrics 확인
   - **FCP (First Contentful Paint)**: < 1.5초
   - **LCP (Largest Contentful Paint)**: < 2.5초 (차트 포함)
   - **TTI (Time to Interactive)**: < 3.5초

4. ✅ React DevTools Profiler 확인
   - AreaChart 렌더링 시간: < 500ms
   - LineChart 렌더링 시간: < 500ms

**예상 결과**:
- [ ] FCP < 1.5초
- [ ] LCP < 2.5초
- [ ] 차트 렌더링이 부드럽고 끊김 없음

---

## 9. 브라우저 호환성 테스트

### 9.1 지원 브라우저 테스트

**테스트 대상 브라우저**:

| 브라우저 | 버전 | 테스트 결과 |
|---------|------|-----------|
| **Chrome** | 120+ | [ ] Pass |
| **Safari** | 16+ | [ ] Pass |
| **Firefox** | 115+ | [ ] Pass |
| **Edge** | 120+ | [ ] Pass |

**테스트 항목**:
- [ ] 회원 탈퇴 5단계 프로세스 정상 작동
- [ ] Admin 통계 대시보드 정상 표시
- [ ] Recharts 차트 정상 렌더링
- [ ] CSV 다운로드 정상 작동
- [ ] 반응형 디자인 정상 작동 (모바일, 태블릿, 데스크톱)

---

### 9.2 반응형 디자인 테스트

**테스트 해상도**:

| 디바이스 | 해상도 | 테스트 결과 |
|---------|-------|-----------|
| **모바일** | 375px × 667px | [ ] Pass |
| **태블릿** | 768px × 1024px | [ ] Pass |
| **데스크톱** | 1920px × 1080px | [ ] Pass |

**테스트 항목**:
- [ ] KPI 카드가 그리드 레이아웃으로 적절히 배치됨
- [ ] 차트가 반응형으로 크기 조정됨 (ResponsiveContainer)
- [ ] 탈퇴 프로세스 UI가 모바일에서도 사용 가능
- [ ] 버튼과 입력 필드가 터치하기 쉬운 크기

---

## 10. 테스트 결과 요약

### 10.1 전체 체크리스트 요약

| 세션 | 테스트 항목 수 | 통과 | 실패 | 비고 |
|-----|--------------|-----|-----|-----|
| **Session 1** (Active User Tracking) | 5 | [ ] | [ ] | |
| **Session 2** (Backend API) | 10 | [ ] | [ ] | |
| **Session 3** (Toss Payments) | 4 | [ ] | [ ] | |
| **Session 4** (Frontend UI) | 15 | [ ] | [ ] | |
| **Session 5** (Admin Statistics) | 20 | [ ] | [ ] | |
| **보안 테스트** | 8 | [ ] | [ ] | |
| **성능 테스트** | 6 | [ ] | [ ] | |
| **브라우저 호환성** | 8 | [ ] | [ ] | |
| **총계** | **76** | **[ ]** | **[ ]** | |

---

### 10.2 Critical Issues (P0 - Blocker)

**테스트 실패 시 프로덕션 배포 불가능한 항목**:

- [ ] 회원 탈퇴 시 개인정보 완전 삭제 검증
- [ ] 사업자등록번호 AES-256-GCM 암호화 검증
- [ ] 관리자 권한 접근 제어 (RBAC) 검증
- [ ] Toss Payments 구독 해지 API 연동
- [ ] Rate Limiting 정상 작동 검증

---

### 10.3 High Priority Issues (P1 - Critical)

**테스트 실패 시 주요 기능 장애 발생 항목**:

- [ ] CSV 다운로드 UTF-8 BOM 인코딩
- [ ] Admin 통계 대시보드 차트 렌더링
- [ ] 30일 보관 데이터 자동 파기 (cron job)
- [ ] Redis 세션 삭제 검증
- [ ] 5단계 탈퇴 프로세스 완료 플로우

---

### 10.4 Medium Priority Issues (P2 - Major)

**사용자 경험에 영향을 주는 항목**:

- [ ] 모바일 반응형 디자인
- [ ] 차트 로딩 상태 표시
- [ ] 자동 새로고침 (60초 간격)
- [ ] 탈퇴 완료 이메일 통지
- [ ] 실시간 통계 펄스 애니메이션

---

### 10.5 Low Priority Issues (P3 - Minor)

**Nice-to-have 항목**:

- [ ] 다크 모드 지원
- [ ] 차트 다운로드 (PNG 이미지)
- [ ] 고급 필터링 (날짜 범위 직접 선택)
- [ ] 통계 데이터 Excel 내보내기 (.xlsx)
- [ ] 탈퇴 사유 통계 분석 대시보드

---

## 부록 A: 테스트 환경 초기화

**개발 환경 리셋 스크립트**:

```bash
#!/bin/bash
# 파일명: scripts/reset-test-env.sh

echo "🔄 Resetting test environment..."

# 1. Docker 컨테이너 중지 및 삭제
docker-compose down -v

# 2. 데이터베이스 재생성
docker-compose up -d db redis
sleep 5

# 3. Prisma 마이그레이션
npx prisma db push

# 4. 시드 데이터 생성
npx prisma db seed

# 5. Redis 초기화
redis-cli FLUSHALL

echo "✅ Test environment reset complete!"
```

---

## 부록 B: 테스트 데이터 생성 스크립트

**파일**: `scripts/seed-test-data.ts`

```typescript
// 테스트용 사용자 생성
await prisma.user.createMany({
  data: [
    {
      email: 'test-user@example.com',
      name: '테스트 사용자',
      role: 'USER',
    },
    {
      email: 'admin@example.com',
      name: '관리자',
      role: 'ADMIN',
    },
    {
      email: 'super-admin@example.com',
      name: '슈퍼 관리자',
      role: 'SUPER_ADMIN',
    },
  ],
});

// 테스트용 활성 사용자 통계 생성 (30일)
for (let i = 0; i < 30; i++) {
  const date = subDays(new Date(), i);
  await prisma.active_user_stats.create({
    data: {
      date,
      uniqueUsers: Math.floor(Math.random() * 50) + 30, // 30-80 사이
      totalPageViews: Math.floor(Math.random() * 300) + 200, // 200-500 사이
    },
  });
}

console.log('✅ Test data seeded successfully!');
```

---

**Connect 플랫폼 테스트 팀**
**작성일**: 2025-11-20
**버전**: 1.0
