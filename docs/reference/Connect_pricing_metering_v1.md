# CONNECT — Pricing Page (Site‑Ready Copy) & Metering Spec

*Last updated: 2025‑09‑24 (KST)*

---

## 1) Pricing Page — Site‑Ready Copy (KR‑first, EN below)

### Hero

**모든 연구·개발 매칭을 한 곳에서.**\
지금 바로 적합한 과제·파트너·인증 체크리스트까지.

- **월간 요금제 / 연간 요금제 토글**
- **좌측**: 플랜 카드(Free, Pro)
- **우측**: 사회적 증명(기관 로고, 후기 2줄)

> VAT 별도. 기업용 세금계산서 발행 지원. 연간 선결제.

### Plan Toggle

- 기본 표시: **연간**
- 토글: 연간 ↔ 월간

### Plans (KR)

#### Free

- 가격: **₩0** / 1인 / 월
- 포함 기능:
  - 매칭 결과 보기: **상세 1건/월 무료**, 나머지는 요약(가중치/임계값 비공개)
  - **Near‑miss 2건/월** (핵심 1\~2개 코칭만 표시)
  - **검색 50회/월**
  - **워크스페이스 1개 / 프로젝트 1개** (읽기 전용 체크리스트)
  - **데이터 주 1회 업데이트** (국가 공공 프로그램 위주)
  - 팀: **1석** (게스트 열람 1명)
  - 알림: **주간 요약** (즉시 알림 없음)
  - 지원: 커뮤니티/FAQ
- CTA: **무료로 시작하기**

#### Pro

- 가격(월간): **₩7,900** / 1인 / 월
- 가격(연간): **₩6,800** / 1인 / 월 (연간 선결제, \~15% 할인)
- 포함 기능:
  - **무제한 상세 매칭** (가중치·임계값·보강 포인트 전체 공개)
  - **실시간/일일 업데이트**, **전 범위 커버리지**(중앙·지자체·재단·기업·RFP)
  - **체크리스트(담당자/마감일/상태) + 자동 제안서 초안**
  - **Warm Intro 5회/월/석 + SLA 추적** (요청→접촉→수락/거절)
  - **내보내기**: CSV/PDF
  - 팀/권한: 다중 워크스페이스·역할·활동 로그
  - 알림: **즉시 알림 + 스마트 알림**(마감, 신규 적합, 상태 변경)
  - 교수/SME 전용 템플릿: IRB/IACUC/COI, 자부담/파트너 MOU 패키지
  - 지원: 이메일(<24h), 선택: 영업일 실시간 채팅(애드온)
- CTA: **Pro로 업그레이드**
- 보조 카피: “연간 결제로 더 절약하세요(₩6,800/월).”

### Social Proof

- “첫 달에 12시간 준비 시간 절감” — 국책연구소 PI
- “프로그램 적중률이 3배 높아졌습니다” — SME CTO

### FAQ (발췌)

- **가격에 VAT 포함인가요?** 표시 가격은 VAT 별도입니다.
- **청구는 어떻게 되나요?** 신용카드/계좌이체/세금계산서(연간) 지원.
- **좌석은 양도 가능한가요?** 동일 조직 내 교체 가능.
- **해지/환불 정책은?** 다음 갱신 전 언제든 해지 가능. 연간은 중도해지 시 잔여월 환불 없음(법정 의무 제외).

---

### Pricing Page — EN Copy (for alt locale)

**All your R&D matching in one place.**\
From the right calls to partner intros and compliant checklists.

- **Monthly / Annual toggle** (default: Annual)
- **Plans:** Free, Pro

**Free** — ₩0 / user / month

- 1 full match detail / month; others redacted
- 2 near‑misses / month (limited coaching)
- 50 searches / month
- 1 workspace / 1 project (read‑only checklist)
- Weekly data refresh (national programs)
- Team: 1 seat (+1 guest view)
- Weekly digest notifications
- Community/FAQ support
- CTA: **Start free**

**Pro** — ₩8,000 monthly
**or** ₩6,800 annual (per user / month, billed yearly)

- Unlimited detailed matches (full explainability)
- Daily/real‑time refresh; full coverage (central, regional, corporate, foundations, fast RFPs)
- Checklists (owners/dates/status) + auto‑drafted proposals
- Warm Intros (5 / month / seat) with SLA tracking
- CSV/PDF export, multi‑workspace, roles & audit log
- Instant/smart alerts; PI/SME template packs
- Email <24h; optional live chat (add‑on)
- CTA: **Upgrade to Pro**

**Footnotes**\
Prices exclude VAT. Annual is prepaid. Invoices available for annual ≥₩1M.

---

## 2) Upgrade Nudges (Copy Snippets)

- 모달(상세 2건째 시도): “**Pro**에서는 가중치·임계값과 **보강해야 할 7가지**를 모두 확인할 수 있어요.”
- 모달(내보내기 시도): “CSV/PDF 내보내기와 **자동 제안서 초안**은 Pro에서 제공됩니다.”
- 배너(near‑miss 80점): “이 항목을 포함해 **총 7개 보강 포인트**를 확인하려면 Pro로 업그레이드하세요.”

---

## 3) Metering Spec — Exact Limits, Events, Backend Checks

### 3.1 Limits (by Plan)

| Capability                | Free                            | Pro                                               |
| ------------------------- | ------------------------------- | ------------------------------------------------- |
| Full match detail unlocks | **1 / month / org**             | **Unlimited**                                     |
| Near‑miss items shown     | **2 / month / user** (redacted) | **Unlimited** (full coaching)                     |
| Searches executed         | **50 / month / user**           | **Unmetered** (fair‑use 2,000/mo hard cap)        |
| Workspaces                | **1 / org**                     | **Unlimited** (soft cap 50; raise via support)    |
| Projects per workspace    | **1**                           | **Unlimited**                                     |
| Data freshness            | **Weekly**                      | **Daily/Realtime** (source‑dependent)             |
| Warm intros               | **0**                           | **5 / month / seat** (pooled within org up to 50) |
| Exports (CSV/PDF)         | **0**                           | **Unlimited** (rate‑limited)                      |
| Alerts                    | **Weekly digest**               | **Instant + smart**                               |
| Team seats                | **1** (+1 guest view)           | **Paid seats; guest views unlimited (read‑only)** |
| API access                | **No**                          | **Yes** (read endpoints; POST for intro requests) |

**Trial:** 7‑day Pro trial auto‑starts on: first Warm Intro attempt **or** first export **or** first owner assignment.

### 3.2 Event Taxonomy (analytics + metering)

- **auth\_login**(user\_id, org\_id)
- **plan\_toggled**(monthly|annual)
- **search\_executed**(query\_hash, filters, duration\_ms)
- **match\_viewed**(match\_id, score)
- **detail\_unlocked**(match\_id) ← counts vs plan limit
- **near\_miss\_shown**(match\_id, n\_items)
- **workspace\_created**(workspace\_id)
- **project\_created**(project\_id)
- **checklist\_created**(project\_id, template)
- **owner\_assigned**(task\_id, user\_id) ← trial trigger
- **export\_attempted**(project\_id, type) ← trial trigger
- **warm\_intro\_requested**(entity\_id) ← trial trigger, Pro quota
- **warm\_intro\_state\_changed**(intro\_id, state)
- **alert\_sent**(type)
- **billing\_upgraded**(seats, term)
- **limit\_blocked**(capability, remaining=0)

### 3.3 Backend Limit Evaluation (reference)

**Identity Model**

- `org_id` (tenant)
- `user_id` (seat holder)
- `plan` at org level; `seat_count`; `term` monthly|annual
- `features_overrides` per org (support can lift caps)

**Counters (Redis)**

- `mtr:{org}:detail_unlocks:{yyyy-mm}`
- `mtr:{user}:near_miss:{yyyy-mm}`
- `mtr:{user}:searches:{yyyy-mm}`
- `mtr:{org}:warm_intros:{yyyy-mm}`
- `mtr:{org}:exports:{yyyy-mm}`

**Pseudocode**

```pseudo
fn can_unlock_detail(user, org):
  if org.plan == "Pro": return ALLOW
  key = f"mtr:{org.id}:detail_unlocks:{now.yyyy_mm}"
  used = redis.INCR(key)
  redis.EXPIRE(key, end_of_month_ttl)
  if used == 1: return ALLOW
  else: return BLOCK(reason="Free limit reached", upsell="Pro shows full details unlimited")

fn can_request_warm_intro(user, org):
  if org.plan != "Pro": return TRIAL_OR_BLOCK
  key = f"mtr:{org.id}:warm_intros:{now.yyyy_mm}"
  used = redis.GET(key) or 0
  quota = 5 * org.seat_count
  if used < quota: redis.INCR(key); return ALLOW
  else: return BLOCK(reason="Intro quota exhausted", offer_addon=true)
```

**Fair‑Use & Abuse Controls**

- Per‑IP & per‑org **search rate** (e.g., ≤10/min), UA anomaly detection, token bucket (burst 20, refill 1/sec)
- **Export** rate limit (org): 30/min; 200/day
- **API** read endpoints paginate; require signed JWT with org scope
- **Trial** mis‑use: one trial/org/12개월 (payment method fingerprinting)

### 3.4 Config Snippets

**YAML (limits by plan)**

```yaml
plans:
  Free:
    detail_unlocks_per_org_per_month: 1
    near_miss_per_user_per_month: 2
    searches_per_user_per_month: 50
    workspaces_per_org: 1
    projects_per_workspace: 1
    data_freshness: weekly
    warm_intros_per_seat_per_month: 0
    exports_enabled: false
    alerts: weekly_digest
    api_access: false
  Pro:
    detail_unlocks_per_org_per_month: inf
    near_miss_per_user_per_month: inf
    searches_per_user_per_month: 2000 # fair‑use hard cap
    workspaces_per_org: 50 # soft cap
    projects_per_workspace: inf
    data_freshness: daily
    warm_intros_per_seat_per_month: 5
    exports_enabled: true
    alerts: instant
    api_access: true
trial:
  triggers: [warm_intro_requested, export_attempted, owner_assigned]
  duration_days: 7
  cooldown_months: 12
```

**Upgrade Modal Copy (KR)**

- 제목: “Pro에서 시간을 절약하세요”
- 본문: “가중치/임계값 공개, 자동 제안서 초안, Warm Intro 5회/월, 실시간 업데이트”
- 버튼: **Pro로 업그레이드** / 나중에

---

## 4) Implementation Notes (handoff to Eng/Design/RevOps)

- **Design**: 2‑카드 레이아웃, Annual 기본 선택, 가격 하단 부가세 표기, FAQ 아코디언
- **BE**: limit checks as middleware; counters in Redis; overrides via admin console
- **Data**: freshness flag per source; Pro 우선 큐
- **Billing**: per‑seat; mid‑cycle proration; invoice for annual ≥₩1M
- **Analytics**: events to Segment (or equivalent), BI dashboard for conversion

---

*End of doc.*

