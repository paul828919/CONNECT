# PDF Extraction Template for R&D Funding Programs

This document provides the standardized extraction schema and prompt template for Claude Code to extract data from Korean R&D funding announcement PDFs.

## User Prompt Template (Korean)

When attaching a PDF, use this prompt:

```
다음 공고 PDF에서 데이터를 추출하여 funding_programs 테이블에 저장해 주세요.

프로그램 ID: [프로그램 ID]
소스: NTIS

작업:
1. PDF에서 데이터 추출
2. scripts/enrich-program-from-pdf.ts 실행하여 DB 저장
3. 저장 결과 검증
```

---

## Extraction Schema

### Section A: Application/Operation Metadata (신청/운영 메타)

| Field | Description | Example |
|-------|-------------|---------|
| `application_open_at` | 신청 시작일시 | `"2025-02-09 09:00"` |
| `application_close_at` | 신청 마감일시 | `"2025-11-17 13:00"` |
| `deadline_time_rule` | 마감 시간 규칙 | `"18:00까지 접수 시스템 제출 완료"` |
| `submission_system` | 접수 시스템 | `"범부처통합혁신사업관리시스템(IRIS)"` |
| `contact` | 문의처 정보 | `"한국연구재단 \| 02-3460-5500 \| email@example.com"` |

### Section B: Budget/Duration (돈/기간)

| Field | Description | Example |
|-------|-------------|---------|
| `budget_total` | 총 사업비 | `"총 52억원"` |
| `budget_per_project` | 과제당 지원금 | `"300백만원/년 × 2년"` |
| `funding_rate` | 정부/민간 분담률 | `"정부 75%, 민간 25%"` |
| `project_duration` | 사업 기간 | `"2년"` |
| `num_awards` | 선정 과제 수 | `"12개 과제"` |

### Section C: Eligibility/Requirements (지원대상/자격요건)

| Field | Description | Example |
|-------|-------------|---------|
| `applicant_org_types` | 신청 가능 기관유형 | `"기업, 대학, 연구기관"` |
| `lead_role_allowed` | 주관기관 가능 유형 | `"중소기업, 중견기업"` |
| `co_role_allowed` | 참여기관 가능 유형 | `"대학, 연구기관"` |
| `consortium_required` | 컨소시엄 필수 여부 | `"필수"` or `"선택"` |
| `required_registrations` | 필수 등록 자격 | `"기업부설연구소"` |
| `required_certifications` | 필수 인증 | `"벤처기업, INNO-BIZ"` |
| `exclusion_rules` | 신청 제외 대상 | `"3년 이내 부정행위 기업, 휴/폐업 기업"` |

### Section D: Domain/Keywords (분야/주제)

| Field | Description | Example |
|-------|-------------|---------|
| `tech_keywords` | 기술 키워드 | `"양자기술, 양자컴퓨팅, 양자센싱"` |
| `domain_tags` | 분야 태그 | `"양자기술, 양자정보통신, 국제공동연구"` |
| `program_type` | 사업 유형 | `"연구개발"` or `"사업화"` or `"인프라"` |

---

## Expected Output Format

Claude Code should extract data into this JSON structure:

```json
{
  "application_open_at": "2025-10-17 09:00",
  "application_close_at": "2025-11-17 13:00",
  "deadline_time_rule": "마감일 13:00까지 IRIS 시스템 제출 완료",
  "submission_system": "범부처통합혁신사업관리시스템(IRIS)",
  "contact": "한국연구재단 양자기술단 | 042-869-7778",
  "budget_total": "총 40억원",
  "budget_per_project": "300백만원/년 × 2년",
  "funding_rate": "정부 100%",
  "project_duration": "2년",
  "num_awards": "5개 과제 내외",
  "applicant_org_types": "기업, 대학, 연구기관",
  "lead_role_allowed": "중소기업, 중견기업, 대학, 연구기관",
  "co_role_allowed": "기업, 대학, 연구기관",
  "consortium_required": "필수 (독일 연구기관과 공동연구)",
  "required_registrations": "명시되지 않음",
  "required_certifications": "명시되지 않음",
  "exclusion_rules": "과제 수행 제한 기관",
  "tech_keywords": "양자기술, 양자컴퓨팅, 양자센싱, 양자통신",
  "domain_tags": "양자기술, 국제공동연구, 한-독 협력",
  "program_type": "연구개발"
}
```

---

## Workflow Steps

### Step 1: Extract Data from PDF

Read the PDF and extract all available fields. Use `"명시되지 않음"` for fields not mentioned in the document.

### Step 2: Execute Database Script

```bash
npx ts-node scripts/enrich-program-from-pdf.ts \
  "<program-id>" \
  '<extracted-json>'
```

### Step 3: Verify Update

Query the database to verify the update:

```bash
npx prisma studio
# Or use direct query
```

Expected verification checks:
- `deadline` matches extracted date
- `budgetAmount` is correctly parsed (300백만원 → 300,000,000)
- `targetType` includes appropriate organization types
- `eligibilityConfidence` = 'HIGH'

---

## Null Value Handling

The following values are treated as null and will NOT be stored:

- `명시되지 않음`
- `해당없음` / `해당 없음`
- `미정` / `미공개`
- `추후 공지` / `추후공지`
- `별도 공지` / `별도공지`
- `N/A` / `n/a`
- `-`
- `없음`
- `미상`
- `공고문 미기재` / `미기재`

---

## Database Field Mappings

| Extracted Field | Database Column | Type |
|-----------------|-----------------|------|
| `application_open_at` | `applicationStart` | DateTime |
| `application_close_at` | `deadline` | DateTime |
| `budget_total` / `budget_per_project` | `budgetAmount` | BigInt |
| `project_duration` | `fundingPeriod` | String |
| `applicant_org_types` | `targetType` | OrganizationType[] |
| `required_certifications` | `requiredCertifications` | String[] |
| `tech_keywords` | `keywords` | String[] |
| `domain_tags` | `eligibilityCriteria.domainTags` | JSON |
| `consortium_required` | `requiresResearchInstitute` | Boolean |

Additional fields are stored in the `eligibilityCriteria` JSON column:
- `deadlineTimeRule`
- `submissionSystem`
- `contactInfo`
- `budgetPerProject`
- `fundingRate`
- `numAwards`
- `leadRoleAllowed`
- `coRoleAllowed`
- `exclusionRules`
- `domainTags`
