# Survey and Matching System Specification v3.1

## S1: Company Survey (S1_서베이_회사_v3.1.csv)

| 섹션 | 질문 | 형식 | 옵션 | 필수 | 검증/헬프 | 시그널키 | 사용처 | 예시 | 조건로직 | 신호가중치(0~1) | 증빙요구 | 개인정보등급 |
|------|------|------|------|------|----------|----------|--------|------|----------|----------------|----------|-------------|
| 프로필 | 사업자 구조 | 단일선택 | 법인/개인사업자 | Y | 법인: 사업자등록증 필요, 개인사업자: 간소화된 요건 | business_structure | Funding,Collab,TT,Investor | 법인 | profile.org_type == 'company' | 0.3 | Y | 일반 |
| 프로필 | 회사 규모(밴드) | 단일선택 | 스타트업/SME/중견/대기업 | Y | — | org_size | Funding,Collab | 중견 | profile.org_type == 'company' | 0.6 | N | 일반 |
| 프로필 | 설립연도 | 숫자(선택) | YYYY | N | 1900–올해 | inc_year | Funding | 2016 | profile.org_type == 'company' | 0.2 | N | 일반 |
| 프로필 | 직원수(밴드) | 단일선택 | 1–10/11–50/51–300/300+ | Y | — | headcount_band | Funding | 51–300 | profile.org_type == 'company' | 0.4 | N | 일반 |
| 프로필 | 직원수(정확 숫자) | 숫자(선택) | 정수 | N | 입력 시 내부적으로 밴드로 매핑 | headcount_exact | Reference | 120 | profile.org_type == 'company' | 0.1 | N | 일반 |
| 프로필 | 사업자등록번호 | 텍스트 | 10자리 또는 13자리 | Y | API 검증 연동, 개인사업자는 10자리 | business_reg_num | Verification | 123-45-67890 | profile.org_type == 'company' | 0.8 | Y | 민감 |
| 프로필 | 개인보증 가능액(개인사업자) | 단일선택 | 1천만원미만/1천-5천만원/5천만원-1억원/1억원이상 | N | 개인사업자만 표시 | personal_guarantee_capacity | Funding | 5천만원-1억원 | answers.business_structure == '개인사업자' | 0.4 | N | 민감 |
| R&D 역량 | 연간 R&D 예산(억원, 밴드) | 단일선택 | ≤1/1–3/3–10/10–30/30+ | Y | — | rd_budget_band | Funding | 10–30 | profile.org_type == 'company' | 0.55 | N | 민감 |
| R&D 역량 | 자부담 가능 비율(총) | 단일선택 | 0/25/50/75% | Y | — | cofund_ratio_total | Funding | 50% | profile.org_type == 'company' | 0.65 | N | 일반 |
| R&D 역량 | 자부담 구성(현금/현물) | 다중선택 | 현금/현물 | N | MSS 요건 확인용 | cofund_split | Funding | 현금, 현물 | answers.cofund_ratio_total in ['25%','50%','75%'] | 0.35 | N | 일반 |
| 기술 단계 | TRL(기술성숙도) | 단일선택 | 1–3/4–6/7–8/9 | Y | TRL 가이드 툴팁 제공 | trl | Funding,Collab,TT | 6 | profile.org_type == 'company' | 0.7 | Y | 일반 |
| 시장증빙 | 시장 검증 수준 | 다중체크 | LOI/유료고객/파일럿완료/인증보유 | N | 증빙 링크 권장 | market_proof | Funding,Collab | LOI, 파일럿완료 | profile.org_type == 'company' | 0.6 | Y | 일반 |
| 증빙 | 증빙 링크 유형 | 다중선택 | 논문/특허/데모/보도/깃허브 | N | 최대 5개 링크, 유형 필수 지정 | evidence_types | All | 데모, 특허 | any(answers.market_proof) | 0.3 | Y | 일반 |
| 증빙 | 증빙 링크(URL) | 다중텍스트 | 최대 5개 | N | 외부 링크 허용(업로드 금지) | evidence_links | All | https://youtu.be/demo | any(answers.market_proof) | 0.3 | Y | 일반 |
| 파트너 | 희망 파트너 유형 | 다중선택 | 대학/정부(출연)연/기업/해외 | Y | — | partner_pref | Collab,Funding | 대학, 정부연 | profile.org_type == 'company' | 0.45 | N | 일반 |
| 시설/테스트베드 | 보유 설비/현장 | 다중체크 | 랩/파일럿라인/실증사이트/없음 | N | — | facility_assets | Collab | 랩, 실증사이트 | profile.org_type == 'company' | 0.25 | N | 일반 |
| 규제/인증 | 관계 규제/인증 경로 | 다중체크 | MFDS/KC/해양/전기/데이터/해외 | N | — | reg_paths | Funding,TT | 해양, 데이터 | profile.org_type == 'company' | 0.2 | N | 일반 |
| 문제정의 | 상위 3개 문제 진술(각 120자) | 짧은텍스트(반복) | 각 항목 태그 1–3개 동시 선택 | Y | 문제-해결 적합도 산출 | problem_statements | TT,Collab | 수질센서 보정 자동화 필요 | profile.org_type == 'company' | 0.5 | N | 일반 |
| 운영특성 | 의사결정 속도 | 단일선택 | 즉시/1주/2-4주/1개월이상 | N | 개인사업자는 보통 빠른 편 | decision_speed | Collab | 즉시 | profile.org_type == 'company' | 0.2 | N | 일반 |
| 운영특성 | 회계/재무 관리 방식 | 단일선택 | 간편장부/복식부기/회계사위탁 | N | 개인사업자 특화 질문 | accounting_method | Funding | 간편장부 | answers.business_structure == '개인사업자' | 0.15 | N | 일반 |

## S2: Government Research Institute Survey (S2_서베이_정부연_v3.csv)

| 섹션 | 질문 | 형식 | 옵션 | 필수 | 검증/헬프 | 시그널키 | 사용처 | 예시 | 조건로직 | 신호가중치(0~1) | 증빙요구 | 개인정보등급 |
|------|------|------|------|------|----------|----------|--------|------|----------|----------------|----------|-------------|
| 기관 프로필 | 기관 유형 | 단일선택 | 정부출연연/지자체연/기타 | Y | — | inst_type | Funding,Collab | 정부출연연 | profile.org_type in ['institute'] | 0.5 | N | 일반 |
| 기관 프로필 | 부서/연구그룹 | 텍스트 | — | Y | — | dept | Collab | 해양센서센터 | profile.org_type in ['institute'] | 0.2 | N | 일반 |
| 역할 | 프로젝트 역할 선호 | 단일선택 | 총괄/주관/참여 | Y | — | proj_role | Funding,Collab | 주관 | profile.org_type in ['institute'] | 0.45 | N | 일반 |
| 자산 | 보유 테스트베드/데이터 | 다중체크 | 파일럿플랜트/해양시험장/장기시계열데이터/없음 | Y | — | assets | Collab,Funding | 해양시험장, 장기시계열데이터 | profile.org_type in ['institute'] | 0.55 | N | 일반 |
| 자산 정책 | 데이터 공유 정책 | 단일선택 | 비공개/협약 필요/익명화 제공/오픈 | Y | — | data_policy | Collab | 협약 필요 | profile.org_type in ['institute'] | 0.35 | N | 일반 |
| 자산 정책 | 테스트베드 인허가/안전준수 | 단일선택 | 허가 보유/협의 필요/미보유 | Y | — | site_compliance | Collab | 허가 보유 | profile.org_type in ['institute'] | 0.35 | N | 일반 |
| 경험 | 다부처/대형과제 경험(밴드) | 단일선택 | 없음/일부/풍부 | Y | — | multi_min_exp_band | Funding | 풍부 | profile.org_type in ['institute'] | 0.4 | N | 일반 |
| 경험(보조) | 최근 3년 주관/참여 횟수 | 숫자(선택) | 정수 | N | 밴드 산정 보조 | multi_min_exp_count | Reference | 주관3, 참여5 | profile.org_type in ['institute'] | 0.15 | N | 일반 |
| 협력의향 | 희망 파트너 | 다중선택 | 대학/기업/해외기관 | Y | — | partner_pref | Collab | 기업, 대학 | profile.org_type in ['institute'] | 0.3 | N | 일반 |
| IP/이전 | IP 정책/수익배분 수용범위 | 단일선택 | 비독점/독점/케이스별 협의 | Y | — | ip_pref | TT | 케이스별 협의 | profile.org_type in ['institute'] | 0.3 | N | 일반 |
| 일정 | 사이트/설비 가용 시기 | 단일선택 | 즉시/1–3개월/3–6개월/6개월+ | Y | — | availability | Collab | 1–3개월 | profile.org_type in ['institute'] | 0.25 | N | 일반 |
| 국제협력 | 국제협력 의향 | 단일선택 | 없음/관심/적극 | N | — | intl_willing | Funding,Collab | 관심 | profile.org_type in ['institute'] | 0.1 | N | 일반 |
| 증빙 | 링크(URL) | 다중텍스트 | 최대 5개 | N | 기관 소개/장비/테스트베드 | evidence_links | All | https://example.org/facility | profile.org_type in ['institute'] | 0.2 | Y | 일반 |

## S3: University Survey (S3_서베이_대학_v3.csv)

| 섹션 | 질문 | 형식 | 옵션 | 필수 | 검증/헬프 | 시그널키 | 사용처 | 예시 | 조건로직 | 신호가중치(0~1) | 증빙요구 | 개인정보등급 |
|------|------|------|------|------|----------|----------|--------|------|----------|----------------|----------|-------------|
| PI 프로필 | 직위 | 단일선택 | 교수/연구교수/박사후/연구원 | Y | — | pi_rank | Funding,TT | 교수 | profile.org_type == 'university' | 0.4 | N | 일반 |
| 연구실 | 규모(밴드) 인원 | 단일선택 | 1–3/4–10/11–20/20+ | Y | — | lab_size_band | Funding,Collab | 11–20 | profile.org_type == 'university' | 0.35 | N | 일반 |
| 연구실 | 규모(정확 숫자) 인원(선택) | 숫자 정수 | N | 내부적으로 밴드로 매핑 | lab_size_exact | Reference | 16 | profile.org_type == 'university' | 0.1 | N | 일반 |
| 과제 이력(밴드) | NRF/부처 과제 경험 | 단일선택 | 없음/낮음/보통/높음 | Y | — | grant_history_band | Funding | 보통 | profile.org_type == 'university' | 0.45 | N | 일반 |
| 과제 이력(보조) | 최근 3년 과제 수 | 숫자(선택) | 정수 | N | 밴드 산정 보조 | grant_history_count | Reference | NRF2, 부처1 | profile.org_type == 'university' | 0.15 | N | 일반 |
| 연구 주제 | 키워드(태그 3–5) | 태그 | 관리어휘 + 자유 | Y | — | research_tags | Funding,TT | 해양바이오, 수질, AI | profile.org_type == 'university' | 0.35 | N | 일반 |
| 기술 단계 | TRL(주요 1–3 기술) | 표 | 기술명/TRL/설명 | Y | TRL 가이드 제공 | trl_assets | Funding,TT | 예: 자산2~3개 | profile.org_type == 'university' | 0.5 | Y | 일반 |
| IP 상태 | 특허 상태 | 단일선택 | 없음/출원/등록(PCT/KR/US/EU) | Y | — | ip_status | TT | 출원(KR) | profile.org_type == 'university' | 0.45 | Y | 일반 |
| TTO 관여 | 산학협력단/지주회사 관여 수준 | 단일선택 | 없음/간헐/활발 | Y | — | tto_involvement | TT | 활발 | profile.org_type == 'university' | 0.35 | N | 일반 |
| COI | 겸직/스핀오프 등 이해상충 신고 | 체크박스 | 예/아니오 | Y | 관련 시 설명 필드 노출 | coi_declared | Compliance | 예 | profile.org_type == 'university' | 0.2 | N | 민감 |
| 상용화 목표 | 경로 선호 | 단일선택 | 라이선스/공동개발/JV/스핀오프 | Y | — | commercial_path | TT,Collab | 공동개발 | profile.org_type == 'university' | 0.3 | N | 일반 |
| 학생가용 | 학부/석/박 인턴 가능 | 다중체크 | 학부/석사/박사/불가 | N | — | student_avail | Collab | 석사, 박사 | profile.org_type == 'university' | 0.1 | N | 일반 |
| 윤리/규정 | IRB/IACUC/데이터준수 | 다중체크 | IRB/IACUC/개인정보/해외반출 | N | — | compliance | Funding,TT | IRB, 개인정보 | profile.org_type == 'university' | 0.2 | N | 민감 |
| 증빙 | 링크(URL) | 다중텍스트 | 최대 5개 | N | 랩페이지/구글스칼라/과제/데모 | evidence_links | All | https://example.edu/lab | profile.org_type == 'university' | 0.25 | Y | 일반 |

## S4: Investor Survey

| field_key | label_kr | label_en | type | required | options | help_kr | help_en |
|-----------|----------|----------|------|----------|---------|---------|---------|
| fund_name | 펀드/운용사 명 | Fund/Manager Name | text | TRUE | | 법인명 또는 펀드명 | Legal entity or fund name |
| fund_type | 투자자 유형 | Investor Type | single_select | TRUE | Government-affiliated;Domestic VC;CVC;Accelerator;PE;Overseas VC;Corp VC;Impact Fund;Angel Network | 하나 선택 | Select one |
| fund_size_auv | 펀드 규모(AUM) | Fund Size (AUM) | range_select | TRUE | <₩10B;₩10–50B;₩50–200B;₩200B–1T;>₩1T | 대략적인 구간 | Approximate band |
| remaining_investment_period | 잔여 투자기간 | Remaining Investment Period | single_select | TRUE | <6m;6–12m;12–24m;>24m | 펀드 잔여 집행 기간 | Time left to deploy capital |
| ticket_min | 티켓 최소 | Ticket Min | number_currency | TRUE | KRW | 최소 투자 금액(억원 단위 가능) | Minimum ticket (KRW) |
| ticket_max | 티켓 최대 | Ticket Max | number_currency | TRUE | KRW | 최대 투자 금액 | Maximum ticket (KRW) |
| ownership_target | 목표 지분율 | Target Ownership | percent | FALSE | | 리드 시 선호 지분율 | Preferred ownership if leading |
| rounds | 라운드 단계 | Round Stages | multi_select | TRUE | Pre-seed;Seed;Bridge/SAFE;Series A;Series B+;Growth | 투자 가능한 라운드 | Rounds you invest in |
| lead_follow | 리드/팔로우 선호 | Lead/Follow Preference | single_select | TRUE | Lead;Follow;Either | 역할 선호 | Role preference |
| business_structure_pref | 사업자 구조 선호 | Business Structure Preference | multi_select | TRUE | Corporate Entity;Sole Proprietorship;Either | 법인/개인사업자 투자 가능 여부 | Investment willingness by business structure |
| sectors | 선호 섹터 | Preferred Sectors | tag_multi | TRUE | AI;Biotech;Medtech;Marine/Ocean;Robotics;Semiconductor;Energy/CleanTech;Manufacturing;Fintech;SaaS;Mobility;Etc | 키워드로 입력 | Enter tags |
| exclusions | 금지 산업 | Exclusions | tag_multi | FALSE | Gambling;Adult;Weapons;Crypto(except infra);Multi-level;Etc | 불가 섹터 | Do-not-invest sectors |
| geo | 지리 선호 | Geography Preference | multi_select | TRUE | Korea-Metro;Korea-Nonmetro;Asia;US;EU;Global | 복수 선택 가능 | Select multiple if applicable |
| ic_cycle | IC 주기 | IC Cycle | single_select | TRUE | Weekly;Bi-weekly;Monthly;Ad-hoc | 투자위원회 주기 | Investment committee cadence |
| decision_speed | 결정 속도(1차 미팅→IC) | Decision Speed (1st mtg→IC) | single_select | TRUE | <2w;2–4w;4–8w;>8w | 대략 소요 기간 | Typical duration |
| governance | 거버넌스 요구 | Governance Requirements | multi_select | FALSE | Board seat;Observer;Protective provisions;Info rights;Reporting monthly;Reporting quarterly | 필요한 권리 | Required rights |
| dd_must_haves | DD 필수 지표/요건 | DD Must-haves | tag_multi | TRUE | Revenue>0;LOI/PO;Medical certification;Security audit;TRL>=6;Pilot completed;IP filed;Personal guarantee validation | 최소 심사 요건 | Minimum diligence asks |
| data_room_items | 데이터룸 항목(링크) | Data Room Items (links) | tag_multi | FALSE | Pitch deck;Financials;Product demo;Pilot report;Regulatory docs;Patents;Personal credit report | 링크 위주 | Prefer links |
| coinvest_policy | 공동투자 정책 | Co-invest Policy | single_select | TRUE | Prefer;Neutral;Avoid | 코인베스트 선호도 | Co-invest preference |
| esg_framework | ESG/임팩트 프레임 | ESG/Impact Framework | single_select | FALSE | UN SDGs;IRIS;None;Other | 선택 | Optional |
| intro_policy | 소개 정책 | Intro Policy | single_select | TRUE | Open inbound;Conditional;Blind teaser first | 인바운드 허용 범위 | Inbound acceptance policy |

## M1: Matching Rules Matrix (M1_매칭_룰_매트릭스_v3.1.csv)

| 프로그램/트랙 | 버전 | 게이트 논리 | 가중치 맵 | 패널티 규칙 | 설명템플릿ID·체크리스트 | near-miss 정책 |
|---------------|------|-------------|----------|-------------|------------------------|----------------|
| MSS_기술혁신개발 | 2025Q4 | gate: (org_size in ['SME','중견'] OR business_structure == '개인사업자') AND trl in [5,6,7] AND cofund_ratio_total >= 25 AND market_proof.any == True | weights: trl=0.28; cofund_ratio_total=0.22; market_proof=0.18; partner_pref(대학/출연연)=0.17; facility_assets=0.10; region_esg=0.05 | penalty: no_evidence_links -> cap80; trl_mismatch -> -0.10; cash_req_fail -> -0.05; sole_prop_guarantee_insufficient -> -0.08 | explain_tpl: EXPL_MSS_KR; checklist_id: CHK_MSS | near_miss: allow ±1 TRL or cofund band; surface up to 5 adjacents; for sole_prop: suggest guarantee enhancement |
| MSS_개인사업자특화 | 2025Q4 | gate: business_structure == '개인사업자' AND trl in [4,5,6] AND personal_guarantee_capacity >= '1천만원' AND market_proof.any == True | weights: market_proof=0.30; personal_guarantee_capacity=0.25; trl=0.20; decision_speed=0.15; accounting_method=0.10 | penalty: no_evidence_links -> cap85; insufficient_guarantee -> -0.15 | explain_tpl: EXPL_MSS_SOLEPROP_KR; checklist_id: CHK_MSS_SOLEPROP | near_miss: suggest guarantee increase options; simplified documentation path |
| NRF_기초연구 | 2025Q4 | gate: org_type=='university' AND trl_assets.min_trl <= 3 AND (compliance has IRB/IACUC if required) | weights: pi_rank=0.12; grant_history_band=0.20; research_tags=0.16; originality_proxy=0.12; plan_quality=0.20; lab_size_band=0.10; ethics=0.10 | penalty: no_evidence_links -> cap85; ethics_fail -> -0.20 | explain_tpl: EXPL_NRF_KR; checklist_id: CHK_NRF | near_miss: show adjacent fields/keywords overlaps ≥70% |
| 기술이전_IP | 2025Q4 | gate: (ip_status in ['출원','등록']) OR (problem_statements.count >=1) | weights: problem_fit=0.38; trl_or_maturity=0.25; absorptive_capacity(headcount_band, rd_budget_band, business_structure)=0.20; ip_pref_match=0.17 | penalty: no_evidence_links -> cap80; exclusivity_conflict -> -0.08; sole_prop_liability_risk -> -0.05 | explain_tpl: EXPL_TT_KR; checklist_id: CHK_TT | near_miss: show non-exclusive alternatives if exclusivity conflict; for sole_prop: suggest liability mitigation |
| 생태계_컨소시엄 | 2025Q4 | gate: has_company AND has_university AND has_institute AND schedule_align AND facility_assets not empty | weights: complementarity=0.30; total_cofund=0.20; testbed=0.20; timeline_fit=0.20; regional_balance=0.10 | penalty: missing_key_partner -> -0.10; schedule_mismatch -> -0.10; business_structure_complexity -> -0.05 | explain_tpl: EXPL_CONS_KR; checklist_id: CHK_CONS | near_miss: propose partner suggestions to fulfill missing roles; suggest corporate conversion for complex consortiums |

## Explanation Templates (Explanation_Templates_v3.1.csv)

| template_id | lang | template_text |
|-------------|------|---------------|
| EXPL_MSS_KR | KR | 이 매치는 {trl}단계 기술과 {cofund_ratio_total} 자부담 조건이 사업 요건과 부합하고, {partner_pref} 파트너 구성으로 가점이 기대되기 때문입니다. 사업자 구조: {business_structure}. 부족한 부분: {gaps}. 다음 단계: {checklist_link} |
| EXPL_MSS_SOLEPROP_KR | KR | 개인사업자 특화 프로그램 매치입니다. 귀하의 {market_proof} 시장검증과 {personal_guarantee_capacity} 개인보증 역량이 프로그램 요건과 일치합니다. 빠른 의사결정({decision_speed})이 장점으로 작용합니다. 개선사항: {gaps}. 다음 단계: {checklist_link} |
| EXPL_NRF_KR | KR | 귀하의 {pi_rank} 경력과 {grant_history_band} 수준의 과제 이력, {research_tags} 주제가 본 사업의 평가항목과 일치합니다. 제안서 보강 포인트: {tips}. 다음 단계: {checklist_link} |
| EXPL_TT_KR | KR | 기업의 문제정의({problem_summary})와 보유 IP({ip_status})/기술성숙도({trl})의 적합도가 높습니다. 사업자 구조({business_structure})를 고려한 제안 라이선스 형태: {license_suggestion}. 다음 단계: {checklist_link} |
| EXPL_CONS_KR | KR | 상보적 자산(기업/대학/연) 조합이 완성되어 {testbed}에서의 실증과 {timeline} 내 상용화가 가능합니다. 부족한 역할: {missing_roles}. 사업자 구조 다양성: {business_structure_mix}. 다음 단계: {checklist_link} |

## Data Quality Rules (Data_Quality_Rules_v3.1.csv)

| rule_id | target_signal | rule_type | condition | on_fail | ui_message_kr | ui_message_en |
|---------|---------------|-----------|-----------|---------|---------------|---------------|
| DQ_BIZ_REG | business_reg_num | required | business_reg_num is empty | block | 사업자등록번호는 필수입니다. | Business registration number is required. |
| DQ_BIZ_REG_FORMAT | business_reg_num | format | business_structure=='법인' and len(business_reg_num)!=13 OR business_structure=='개인사업자' and len(business_reg_num)!=10 | block | 법인은 13자리, 개인사업자는 10자리 사업자등록번호가 필요합니다. | Corporate entities need 13-digit, sole proprietorships need 10-digit business registration numbers. |
| DQ_PERSONAL_GUARANTEE | personal_guarantee_capacity | required_if | business_structure=='개인사업자' and personal_guarantee_capacity is empty | warn | 개인사업자는 개인보증 가능액 입력을 권장합니다. | Personal guarantee capacity is recommended for sole proprietorships. |
| DQ_SOLE_PROP_FUNDING | cofund_ratio_total | consistency | business_structure=='개인사업자' and cofund_ratio_total=='75%' and personal_guarantee_capacity in ['1천만원미만'] | warn | 개인보증 능력 대비 자부담 비율이 높을 수 있습니다. | Co-funding ratio may be high relative to personal guarantee capacity. |
| DQ_TRL_EVID | trl | required_if | trl in ['7–8','9'] and len(evidence_links)==0 | block | TRL 7 이상은 프로토타입/인증 등의 증빙 링크가 필요합니다. | Evidence is required for TRL ≥7. |
| DQ_HEADCOUNT_RD | headcount_band | consistency | headcount_band in ['1–10'] and rd_budget_band in ['10–30','30+'] | warn | 직원수 대비 R&D 예산이 비현실적일 수 있습니다. 값을 확인해 주세요. | R&D budget may be unrealistic for given headcount. |
| DQ_COFUND_SPLIT | cofund_ratio_total | required_if | cofund_ratio_total in ['25%','50%','75%'] and cofund_split is empty | warn | 자부담 비율을 선택하면 현금/현물 구성 입력을 권장합니다. | Please provide cash/in-kind split when co-funding is selected. |
| DQ_UNIV_COI | coi_declared | required_if | org_type=='university' and commercial_path in ['스핀오프','JV'] and coi_declared!='예' | block | 스핀오프/JV 선택 시 이해상충(COI) 확인이 필요합니다. | COI confirmation is required for spin-off/JV. |
| DQ_LINK_MAX | evidence_links | limit | len(evidence_links) > 5 | trim | 증빙 링크는 최대 5개까지 등록됩니다. | Evidence links limited to 5. |
| DQ_CITY_NORMALIZE | city | normalize | not in canonical_city_list | auto | 공식 지명으로 자동 정규화되었습니다. | Auto-normalized to official city name. |

## Intro SLA States (Intro_SLA_States_v3.csv)

| key | value | note |
|-----|-------|------|
| intro_state | requested | 요청됨 → 24h 내 1차 확인 |
| intro_state | contacted | 소개자 접촉중 → 3영업일 내 응답 |
| intro_state | accepted | 수락됨 → 미팅 일정 협의 |
| intro_state | declined | 거절됨 → 사유 기록 및 대안 제시 |
| SLA | response_time_hours | 72 |
| SLA | expiry_days | 14 |

## Output Checklist Templates (Output_Checklist_Templates_v3.1.csv)

| checklist_id | 항목 | 내용 | lead_time_days |
|--------------|------|------|----------------|
| CHK_MSS | 필수서류(법인) | 사업자등록증, 재무제표, 공동개발 협약서(초안), 자부담 증빙(현금/현물) | 21 |
| CHK_MSS_SOLEPROP | 필수서류(개인사업자) | 사업자등록증(10자리), 개인신용보고서, 소득증명원, 개인보증서, 간소화된 자부담 증빙 | 14 |
| CHK_NRF | 필수서류 | 연구계획서, PI 이력, IRB/IACUC(해당 시), 기관 간접비 규정 | 28 |
| CHK_TT | 필수서류 | 특허명세서/출원번호, 기술설명서, 라이선스 조건 초안, 사업자 구조별 계약서 템플릿 | 14 |
| CHK_CONS | 역할분담 | 기업: 사업화/시장(사업자 구조별 역할 명시), 대학: 알고리즘/실험, 정부연: 테스트베드/규제 | 21 |

## Scoring Signals Registry (Scoring_Signals_Registry_v3.1.csv)

| signal_key | 설명 | 도메인 | 비고 |
|------------|------|--------|------|
| business_structure | 사업자 구조 | 법인/개인사업자 | 개인사업자는 간소화된 요건 적용, 의사결정 속도 가점 |
| personal_guarantee_capacity | 개인보증 가능액 | 금액 밴드 | 개인사업자 전용, 펀딩 규모 적정성 판단 |
| decision_speed | 의사결정 속도 | 즉시/1주/2-4주/1개월이상 | 개인사업자는 일반적으로 빠른 편, 협업 적합도에 영향 |
| accounting_method | 회계관리 방식 | 간편장부/복식부기/회계사위탁 | 개인사업자 특화, 펀딩 신뢰도 지표 |
| trl | 기술성숙도 | 1–3/4–6/7–8/9 | 높을수록 사업화형에 유리, 낮을수록 기초연구형에 유리 |
| cofund_ratio_total | 자부담 비율 | 0/25/50/75% | 사업 유형별 최소 요건 존재 |
| market_proof | 시장증빙 | LOI/유료고객/파일럿/인증 | 증빙 링크로 신뢰등급↑ |
| partner_pref | 파트너 선호 | 대학/정부연/기업/해외 | 컨소시엄 가점 여부 |
| facility_assets | 설비/테스트베드 | 랩/파일럿/실증 | 실증·대형과제 적합도 |
| grant_history_band | 과제 경험(대학) | 없음/낮음/보통/높음 | NRF 등 기초연구형에 가점 |
| tto_involvement | TTO 관여 | 없음/간헐/활발 | 기술이전 실행 가능성 지표 |
| ip_status | 특허 상태 | 없음/출원/등록 | 기술이전/투자 선호도 |
| absorptive_capacity | 흡수역량(파생) | headcount/rd_budget/business_structure | 기술 도입·확장 능력, 사업자 구조별 차등 적용 |

## Normalization Dictionary (Normalization_Dictionary_v2.1.csv)

| 유형 | 변형값 | 표준값 | 카테고리 |
|------|--------|--------|----------|
| 사업자구조 | 법인사업자 | 법인 | business_structure |
| 사업자구조 | 개인 | 개인사업자 | business_structure |
| 사업자구조 | 자영업자 | 개인사업자 | business_structure |
| 사업자구조 | corporate | 법인 | business_structure |
| 사업자구조 | individual | 개인사업자 | business_structure |
| 사업자구조 | sole prop | 개인사업자 | business_structure |
| 조직명 | 부산대 | 부산대학교 | school |
| 조직명 | Pusan National Univ. | 부산대학교 | school |
| 조직명 | 연세대 | 연세대학교 | school |
| 조직명 | KIOST | 한국해양과학기술원 | institute |
| 조직명 | ETRI | 한국전자통신연구원 | institute |
| 직책 | Sr Researcher | Senior Researcher | title |
| 직책 | 선임연구원 | Senior Researcher | title |
| 직책 | 조교수 | Assistant Professor | title |
| 도시 | 부산 기장군 | 부산광역시 기장군 | city |
| 도시 | 서울 강남구 | 서울특별시 강남구 | city |

## M2: Investor Matching Rules

| rule_type | key | operator | value | notes | weight | calc | delta | action |
|-----------|-----|----------|-------|-------|--------|------|-------|--------|
| gate | round_fit | IN | candidate.round IN investor.rounds | 투자 가능 라운드 일치 여부 | | | | |
| gate | ticket_band | BETWEEN | ticket_min <= candidate.ask <= ticket_max | 티켓 크기 적합성 | | | | |
| gate | sector_fit | INCLUSION | overlap(candidate.sectors, investor.sectors) AND not overlap(candidate.sectors, investor.exclusions) | 섹터 정합성 + 금지 충돌 차단 | | | | |
| gate | geo_fit | IN | candidate.geo IN investor.geo | 지리 선호 일치 | | | | |
| gate | business_structure_fit | IN | candidate.business_structure IN investor.business_structure_pref | 사업자 구조 호환성 | | | | |
| gate | dd_minimum | MEETS | candidate.dd_tags ⊇ investor.dd_must_haves | 최소 심사 요건 충족 | | | | |
| weight | problem_solution_fit | | | 문제–해결 적합도 | 0.25 | semantic_fit(candidate.problem, investor.sectors) | | |
| weight | market_proof | | | 시장/실증 증빙 강도 | 0.2 | evidence_score(candidate.evidence) | | |
| weight | team_absorptive | | | 팀·흡수역량 | 0.2 | team_score(candidate.team, domain_match, business_structure_bonus) | | |
| weight | round_ticket_alignment | | | 라운드–티켓 합치 | 0.2 | band_fit(candidate.ask, investor.ticket_min,max) * round_alignment | | |
| weight | timing | | | 타이밍 적합 | 0.15 | ic_cycle_alignment(investor.ic_cycle) * runway_fit(candidate.runway) | | |
| near_miss | ticket_band_relax | | | 브릿지/SAFE/공투 대안 제시 | | | +/-1 | propose_bridge_SAFE_or_coinvest |
| near_miss | round_adjacent | | | 인접 라운드/마일스톤 유도 | | | +/-1 | suggest_adjacent_round_or_milestone_plan |
| near_miss | business_structure_conversion | | | 법인전환 가이드 제공 | | | | suggest_corporate_conversion_timeline |

## Investor Explanation Templates

| template_id | language | use_for | title | body |
|-------------|----------|---------|-------|------|
| INV_TOP_EN | EN | Top match | Why you match with {{investor_name}} | Round {{round}}, ticket {{ticket}} fits {{investor_ticket_min}}–{{investor_ticket_max}}; sectors overlap on {{sector_overlap}}. Business structure ({{business_structure}}) accepted. Evidence strength: {{evidence_score}}. Next step: request warm intro; IC cadence {{ic_cycle}}; expected decision in {{decision_eta}}. |
| INV_TOP_KR | KR | Top match | 왜 {{investor_name}}와 잘 맞는지 | 라운드 {{round}}, 티켓 {{ticket}}이(가) 투자자 범위({{investor_ticket_min}}–{{investor_ticket_max}})와 일치하고, 섹터가 {{sector_overlap}}에서 겹칩니다. 사업자 구조({{business_structure}}) 투자 가능. 증빙 강도: {{evidence_score}}. 다음 단계: 따뜻한 소개 요청 → IC 주기 {{ic_cycle}}, 예상 결정 {{decision_eta}}. |
| INV_NEARMISS_EN | EN | Near-miss | Close match — how to upgrade | {{business_structure_issue}}. Ticket slightly {{direction}} investor band; consider {{bridge_option}} or co-invest with {{coinvest_partners}}. Add evidence: {{missing_evidence}} to reach Top. |
| INV_NEARMISS_KR | KR | Near-miss | 거의 일치 — 승급 방법 | {{business_structure_issue}}. 티켓이 투자자 범위에서 {{direction}}입니다. {{bridge_option}} 또는 {{coinvest_partners}}와 공동투자를 고려하세요. 다음 증빙({{missing_evidence}})을 보강하면 Top으로 승급합니다. |

*Source: Updated from Survey Specification v3.0 to include sole proprietorship considerations.*