# Korean R&D Terminology Glossary
**Purpose**: Comprehensive reference for AI prompt engineering
**Date**: October 9, 2025
**Use Case**: Claude Sonnet 4.5 integration for Connect Platform

---

## 🎯 TRL (Technology Readiness Level) - 기술성숙도

### Complete TRL Definitions

| TRL | Korean Term | English | Phase | Description (Korean) |
|-----|-------------|---------|-------|---------------------|
| **TRL 1** | 기초 연구 | Basic Research | 기초 연구 | 기술 개념 및 특성을 정의하는 단계. 관찰된 현상을 바탕으로 기술의 잠재적 응용 가능성을 탐색합니다. |
| **TRL 2** | 응용 연구 | Applied Research | 기초 연구 | 기술 개념 및 응용 방법을 정립하는 단계. 이론적 기반과 실험을 통해 기술의 실현 가능성을 검토합니다. |
| **TRL 3** | 개념 검증 | Proof of Concept | 응용 연구 | 핵심 기능 및 특성을 실험적으로 검증하는 단계. 연구실 환경에서 기술의 타당성을 확인합니다. |
| **TRL 4** | 연구실 시제품 제작 | Lab Prototype | 연구 개발 | 연구실 환경에서 기술을 검증하는 단계. 기본 기능이 작동하는 프로토타입을 제작합니다. |
| **TRL 5** | 시험 환경 시제품 제작 | Alpha Prototype | 연구 개발 | 유사 환경에서 기술을 검증하는 단계. 실제 환경과 유사한 조건에서 성능을 테스트합니다. |
| **TRL 6** | 시제품 성능 평가 | Beta Prototype | 개발 완료 | 실제 환경에서 기술을 검증하는 단계. 파일럿 테스트를 통해 실용성을 평가합니다. |
| **TRL 7** | 사업화 시제품 제작 | Pre-commercial | 사업화 준비 | 사업화 초기 단계의 시제품을 제작하는 단계. 대량 생산 준비와 시장 진입을 준비합니다. |
| **TRL 8** | 시험 인증 및 표준화 | Commercial Ready | 사업화 직전 | 시험 인증 및 표준화를 완료하는 단계. 정식 출시를 위한 모든 인증과 테스트를 완료합니다. |
| **TRL 9** | 사업화 | Commercialization | 상용화 | 본격적인 사업화 단계. 시장에서 판매되고 있으며, 지속적인 개선이 이루어집니다. |

### TRL Transitions (중요한 전환점)

**TRL 3 → 4 전환**:
- 이론에서 실제 구현으로 전환
- Required: 연구실 환경에서 작동하는 프로토타입
- Common gap: 개념은 좋지만 실제 구현이 어려운 경우

**TRL 6 → 7 전환** (가장 중요!):
- 연구 개발에서 사업화로 전환
- Required: 실제 환경 검증 완료, 사업화 계획 수립
- Common gap: 기술은 완성되었으나 시장 진입 준비 부족
- 💡 **Most grants target this transition**: IITP, KEIT 등 대부분의 사업화 지원 과제

**TRL 7 → 8 전환**:
- 사업화 준비에서 상용화로 전환
- Required: 각종 인증 (ISMS-P, KC, ISO 등) 완료
- Common gap: 인증 비용 및 시간 소요

### TRL by Industry (산업별 TRL 요구사항)

| Industry | Typical Starting TRL | Target TRL | Key Requirements |
|----------|---------------------|------------|------------------|
| **ICT/SW** | 5-6 | 8-9 | ISMS-P, GS 인증 |
| **Hardware/IoT** | 6-7 | 8-9 | KC 인증, EMC 테스트 |
| **AI/ML** | 4-5 | 7-8 | 학습 데이터, 성능 검증 |
| **Biotech** | 3-4 | 6-7 | 임상 시험, FDA/MFDS 승인 |
| **Manufacturing** | 6-7 | 9 | ISO 9001, 품질 관리 시스템 |

---

## 🏅 Certifications & Standards - 인증 및 표준

### ISMS-P (정보보호 및 개인정보보호 관리체계)
**Full Name**: Information Security Management System - Personal Information
**Issuer**: KISA (한국인터넷진흥원)
**Target**: SaaS, AI, 클라우드 서비스 기업
**Cost**: ₩30M-50M (컨설팅 포함)
**Duration**: 6-12 months
**Validity**: 3 years (매년 사후 심사)

**16-Item Checklist** (Connect uses this):
1. 정보보호 정책 수립
2. 위험 관리 체계 구축
3. 접근 통제 및 인증
4. 암호화 적용
5. 개인정보 처리 방침
6. 데이터 백업 및 복구
7. 침해 사고 대응 절차
8. 보안 교육 실시
9. 물리적 보안 (서버실)
10. 네트워크 보안
11. 로그 관리
12. 취약점 점검
13. 개인정보 최소 수집
14. 개인정보 파기 절차
15. 제3자 제공 관리
16. 정기 점검 및 개선

**Why Important**: IITP, KISA 과제 대부분 필수 요건

---

### KC (한국 안전 인증)
**Full Name**: Korea Certification
**Issuer**: 국가기술표준원 (KATS)
**Target**: 하드웨어, IoT, 전자제품
**Cost**: ₩5M-20M (제품 복잡도에 따라)
**Duration**: 3-6 months
**Validity**: 3 years

**8-Item Document Checklist**:
1. 제품 사양서
2. 회로도 및 부품 리스트
3. 사용자 매뉴얼 (한국어)
4. EMC 테스트 리포트
5. 안전성 테스트 리포트
6. 제조 공정서
7. 품질 관리 계획서
8. 시험 성적서 (공인 시험 기관)

**Testing Bodies** (시험 기관):
- KTL (한국산업기술시험원)
- KTC (한국화학융합시험연구원)
- FITI (한국의류시험연구원)

**Why Important**: KEIT, MOTIE 과제에서 하드웨어 제품 필수

---

### ISO 9001 (품질경영시스템)
**Full Name**: Quality Management System
**Issuer**: International Organization for Standardization
**Target**: 제조업, 서비스업 (모든 산업)
**Cost**: ₩10M-30M (컨설팅 포함)
**Duration**: 6-9 months
**Validity**: 3 years (매년 사후 심사)

**Core Principles**:
- 고객 중심 (Customer focus)
- 리더십 (Leadership)
- 프로세스 접근 (Process approach)
- 지속적 개선 (Continuous improvement)
- 증거 기반 의사결정 (Evidence-based decision making)

**Why Important**: 중견기업 이상 대부분 보유, 품질 신뢰성 증명

---

### GS (굿소프트웨어)
**Full Name**: Good Software Certification
**Issuer**: TTA (한국정보통신기술협회)
**Target**: 국산 소프트웨어 제품
**Cost**: ₩3M-10M
**Duration**: 2-4 months
**Validity**: 2 years

**1급/2급 구분**:
- **1급**: 품질, 기능, 보안 모두 우수 (80점 이상)
- **2급**: 품질, 기능 우수 (70-79점)

**Why Important**: 공공기관 납품 시 가산점, 혁신제품 지정 우대

---

### NEP (신제품)
**Full Name**: New Excellent Product
**Issuer**: 조달청
**Target**: 혁신적인 신제품 (3년 이내 개발)
**Cost**: 무료 (인증 비용 없음, 검증 비용만)
**Duration**: 3-6 months
**Validity**: 5 years

**Requirements**:
- 개발 완료 후 3년 이내
- 국내 최초 또는 현저히 개선된 제품
- 시험 성적서 (성능, 안전성)
- KC 또는 기타 안전 인증 보유

**Why Important**: 공공기관 수의계약 가능, 조달청 우선 구매

---

## 📋 Grant Types - 과제 유형

### R&D 과제 (Research & Development)
- **예산 규모**: ₩1억-10억
- **기간**: 1-3년
- **목적**: 기술 개발, 연구 수행
- **대상**: 기업, 연구소, 대학
- **평가 기준**: 기술 혁신성, 실현 가능성, 연구 능력

### 사업화 지원 (Commercialization Support)
- **예산 규모**: ₩0.5억-5억
- **기간**: 6개월-2년
- **목적**: 개발된 기술의 시장 진입
- **대상**: 중소기업, 벤처기업
- **평가 기준**: 시장성, 사업화 계획, TRL 7 이상

### 기술 개발 (Technology Development)
- **예산 규모**: ₩2억-20억
- **기간**: 2-5년
- **목적**: 원천 기술 개발
- **대상**: 대학, 연구소, 대기업
- **평가 기준**: 학술적 가치, 파급 효과, 연구 실적

### 인력 양성 (Human Resource Development)
- **예산 규모**: ₩0.3억-3억
- **기간**: 6개월-3년
- **목적**: 전문 인력 교육 및 훈련
- **대상**: 교육 기관, 기업
- **평가 기준**: 교육 프로그램 품질, 취업률

### 국제 협력 (International Collaboration)
- **예산 규모**: ₩1억-10억
- **기간**: 1-3년
- **목적**: 해외 기관과 공동 연구
- **대상**: 글로벌 R&D 역량 보유 기관
- **평가 기준**: 해외 파트너 수준, 협력 실적

### 혁신 제품 (Innovative Product)
- **예산 규모**: ₩0.5억-3억
- **기간**: 1-2년
- **목적**: 혁신적 신제품 개발
- **대상**: 중소기업
- **평가 기준**: 혁신성, NEP 가능성, 시장성

### 우수 제품 (Excellent Product)
- **예산 규모**: ₩0.3억-2억
- **기간**: 6개월-1년
- **목적**: 기존 제품 고도화
- **대상**: 중소기업, 중견기업
- **평가 기준**: 품질 개선, 인증 보유, 구매 실적

---

## 🏢 Organization Types - 기관 유형

| Korean | English | Definition | Revenue Range |
|--------|---------|------------|---------------|
| **중소기업** | SME | 중소기업기본법 기준: 직원 300명 미만 또는 매출 400억 이하 | <₩400억 |
| **중견기업** | Mid-sized | 중소기업 초과, 대기업 미만 | ₩400억-1조 |
| **대기업** | Large Corp | 자산 5조 이상 또는 상호출자제한 집단 | >₩1조 |
| **벤처기업** | Venture | 벤처기업 인증 보유 (기술성, 성장성 평가) | Variable |
| **스타트업** | Startup | 창업 7년 이내 | Variable |
| **연구소** | Research Institute | 정부 출연 연구기관 (KIST, ETRI 등) | N/A |
| **대학** | University | 4년제 대학교, 전문대학 | N/A |
| **공공기관** | Public Institution | 정부 산하 기관 (한국전력, 도로공사 등) | N/A |

---

## 💰 Grant Budget Terms - 예산 관련 용어

| Korean | English | Description |
|--------|---------|-------------|
| **연구개발비** | R&D Budget | 과제 수행에 필요한 전체 비용 |
| **정부 출연금** | Government Grant | 정부가 지원하는 금액 (보통 50-80%) |
| **기업 부담금** | Company Contribution | 기업이 부담하는 금액 (보통 20-50%) |
| **직접비** | Direct Cost | 연구 수행에 직접 투입되는 비용 (인건비, 재료비 등) |
| **간접비** | Indirect Cost | 연구 수행을 위한 간접 비용 (관리비, 전기세 등) |
| **인건비** | Labor Cost | 연구원 급여 |
| **연구재료비** | Material Cost | 실험 재료, 부품 구매 비용 |
| **연구설비비** | Equipment Cost | 연구 장비 구매 비용 |
| **연구활동비** | Research Activity | 출장비, 회의비, 논문게재료 등 |
| **위탁 연구비** | Subcontract Cost | 외부 기관에 위탁하는 연구 비용 |

---

## 📊 Application Terms - 신청 관련 용어

| Korean | English | Description |
|--------|---------|-------------|
| **공고** | Announcement | 과제 모집 공지 |
| **접수 기간** | Application Period | 신청서 제출 가능 기간 |
| **마감일** | Deadline | 신청 마감 날짜 |
| **선정 평가** | Selection Review | 과제 선정을 위한 심사 |
| **선정률** | Selection Rate | 신청 대비 선정 비율 (예: 38%) |
| **협약** | Agreement | 선정 후 정부와 체결하는 계약 |
| **중간 점검** | Mid-term Review | 과제 수행 중 진행 상황 점검 |
| **최종 평가** | Final Evaluation | 과제 종료 후 성과 평가 |
| **정산** | Settlement | 과제 종료 후 비용 정산 |
| **성과 보고** | Performance Report | 과제 수행 결과 보고 |

---

## 🤝 Consortium Terms - 컨소시엄 용어

| Korean | English | Description |
|--------|---------|-------------|
| **주관 기관** | Lead Organization | 과제를 총괄하는 기관 (보통 기업) |
| **참여 기관** | Participating Org | 과제에 참여하는 협력 기관 |
| **공동 연구** | Joint Research | 여러 기관이 함께 수행하는 연구 |
| **위탁 연구** | Subcontract Research | 특정 부분을 외부에 맡기는 연구 |
| **협약서** | Consortium Agreement | 참여 기관 간 역할 및 비용 분담 계약 |
| **지분율** | Share Ratio | 각 기관의 연구 비용 분담 비율 |
| **역할 분담** | Role Assignment | 각 기관의 연구 업무 분담 |

---

## 📈 Success Metrics - 성과 지표

| Korean | English | Description |
|--------|---------|-------------|
| **선정률** | Selection Rate | 신청 대비 선정된 과제 비율 |
| **심사 기간** | Review Duration | 신청부터 선정까지 소요 기간 |
| **기술 이전** | Technology Transfer | 개발 기술을 기업에 이전 |
| **특허 출원** | Patent Application | 연구 결과로 특허 신청 |
| **논문 게재** | Publication | 학술지 논문 발표 |
| **매출 발생** | Revenue Generation | 과제 결과로 발생한 매출 |
| **고용 창출** | Job Creation | 과제로 인한 신규 채용 인원 |
| **후속 투자** | Follow-up Investment | 과제 후 받은 투자 금액 |

---

## 🗣️ Common Korean Phrases for AI Responses

### Formal Greetings (존댓말)
- "안녕하세요" - Hello (formal)
- "귀사" - Your company (honorific)
- "귀하" - You (honorific, written)
- "~하시다" - (honorific verb ending)
- "~입니다" - Is/are (formal declarative)
- "~습니다" - (formal declarative, after consonant)
- "~세요" - Please (honorific)

### Match Explanation Phrases
- "귀사의 산업 분야와 일치합니다" - Matches your company's industry sector
- "기술 수준이 적합합니다" - Technology level is suitable
- "선정 가능성이 높습니다" - High probability of selection
- "다음 요건을 충족합니다" - Meets the following requirements
- "주의가 필요한 사항" - Points requiring attention
- "추가 준비가 필요합니다" - Additional preparation needed

### Q&A Response Phrases
- "일반적으로 ~입니다" - Generally, it is~
- "공고문을 직접 확인하시기 바랍니다" - Please check the announcement directly
- "구체적인 내용은 ~에 문의하세요" - For specific details, please contact~
- "평균적으로 ~일 소요됩니다" - On average, it takes ~ days
- "다음 단계를 권장드립니다" - We recommend the following steps
- "불확실한 부분이 있어" - There are uncertain aspects

### Disclaimers
- "본 정보는 일반적인 안내입니다" - This information is general guidance
- "최종 확인이 필요합니다" - Final confirmation is required
- "공식 공고문을 참고하세요" - Please refer to the official announcement
- "전문가 상담을 권장합니다" - Professional consultation is recommended

---

## 🎓 Agency-Specific Terminology

### IITP (정보통신기획평가원)
- **Full Name**: Institute for Information & Communications Technology Planning & Evaluation
- **Focus**: ICT, AI, SW, 5G/6G, 클라우드
- **Common Terms**: "AI 융합", "디지털 전환", "지능형 서비스"
- **Certification Requirements**: ISMS-P, GS, ISO 27001

### KEIT (한국산업기술평가관리원)
- **Full Name**: Korea Evaluation Institute of Industrial Technology
- **Focus**: 제조, 소재부품장비, 에너지, 로봇
- **Common Terms**: "소부장", "뿌리산업", "스마트공장"
- **Certification Requirements**: KC, ISO 9001, 안전 인증

### TIPA (중소기업기술정보진흥원)
- **Full Name**: Technology Innovation & Promotion Agency for SMEs
- **Focus**: 중소기업 기술 혁신, 사업화 지원
- **Common Terms**: "기술 혁신", "창업", "성장 지원"
- **Certification Requirements**: 중소기업 확인서, 벤처 인증

### KIMST (해양수산과학기술진흥원)
- **Full Name**: Korea Institute of Marine Science & Technology Promotion
- **Focus**: 해양, 수산, 극지, 해양 로봇
- **Common Terms**: "해양 자원", "친환경 양식", "스마트 항만"
- **Certification Requirements**: 해양 안전 인증, 환경 영향 평가

---

## 🔍 Glossary Quick Reference

**Most Frequently Used Terms** (Top 20):
1. TRL (기술성숙도) - Technology Readiness Level
2. ISMS-P - Information Security Management System
3. KC - Korea Certification
4. 중소기업 - Small/Medium Enterprise
5. 연구개발비 - R&D Budget
6. 정부 출연금 - Government Grant
7. 주관 기관 - Lead Organization
8. 참여 기관 - Participating Organization
9. 선정률 - Selection Rate
10. 사업화 - Commercialization
11. 인증 - Certification
12. 공고 - Announcement
13. 마감일 - Deadline
14. 협약 - Agreement
15. 컨소시엄 - Consortium
16. 특허 - Patent
17. 벤처기업 - Venture Company
18. 스타트업 - Startup
19. 혁신 제품 - Innovative Product
20. 우수 제품 - Excellent Product

---

**Last Updated**: October 9, 2025
**Total Terms**: 100+
**Status**: ✅ Complete and ready for prompt engineering
**Next**: Day 3 - Use this glossary in prompt templates
