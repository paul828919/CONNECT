# NTIS API Key Application Guide

Complete step-by-step guide to obtaining your own NTIS API key for production use.

## 📋 Prerequisites

Before applying, make sure you have:
- [ ] NTIS account (create at https://www.ntis.go.kr)
- [ ] Korean mobile phone number (for verification)
- [ ] Clear purpose for API usage
- [ ] Estimated usage volume

---

## 🚀 Step-by-Step Application Process

### Step 1: Log in to NTIS

1. Go to: **https://www.ntis.go.kr**
2. Click **"로그인"** (Login) in the top right
3. Log in with your credentials
   - If you don't have an account, click **"회원가입"** (Sign Up)

---

### Step 2: Navigate to OpenAPI Page

1. From the main menu, hover over **"데이터활용"** (Data Utilization)
2. Click **"OpenAPI"**
   
   Or go directly to: **https://www.ntis.go.kr/rndopen/api/mng/apiMain.do**

---

### Step 3: Select API Service

You'll see a list of available APIs. For the Connect platform, select:

**"국가R&D 과제검색 서비스(대국민용)"**  
(National R&D Project Search Service - Public)

Features:
- ✅ No organization restrictions
- ✅ Highest request limits
- ✅ Covers all agencies
- ✅ Real-time data

---

### Step 4: Click "활용신청" (Application)

1. On the API detail page, click the orange **"활용신청"** button
2. You'll be redirected to the application form

---

### Step 5: Fill Out Application Form

#### Required Fields:

1. **서비스명** (Service Name)
   ```
   Connect - R&D Matching Platform
   ```

2. **서비스 설명** (Service Description)
   ```
   국내 R&D 과제와 기업/연구기관을 매칭하는 플랫폼에서 
   NTIS 공고 정보를 실시간으로 수집하여 사용자에게 제공
   
   (Platform for matching Korean R&D projects with companies/research 
   institutes, collecting NTIS announcement information in real-time)
   ```

3. **활용 목적** (Purpose)
   ```
   - R&D 과제 공고 정보 수집
   - 기업/연구기관 매칭 알고리즘 입력 데이터
   - 사용자에게 맞춤형 R&D 기회 제공
   ```

4. **예상 이용량** (Expected Usage)
   ```
   - 일일 요청: 약 50-100건
   - 피크 시즌: 약 200건/일
   - 주요 사용 시간: 오전 9시, 오후 3시
   ```

5. **서비스 URL** (Service URL - if applicable)
   ```
   https://connect.your-domain.com
   또는
   개발 중 (Currently in development)
   ```

6. **담당자 정보** (Contact Information)
   - Name: [Your name]
   - Email: [Your email]
   - Phone: [Your phone]
   - Organization: [Your company/organization]

7. **이용 기간** (Usage Period)
   ```
   2025-01-01 ~ 2027-12-31 (또는 장기)
   ```

---

### Step 6: Submit Application

1. Review all information
2. Check the agreement box (개인정보 수집 및 이용 동의)
3. Click **"신청"** (Submit)

---

### Step 7: Wait for Approval

**Timeline:**
- ⏰ **Normal approval time**: 1-2 business days
- 📧 **Notification**: Email to registered address
- 🔑 **API Key**: Included in approval email

**What to expect:**
- NTIS staff will review your application
- They may contact you for clarification
- Approval email contains your unique API key

---

### Step 8: Receive API Key

Your approval email will contain:

```
귀하의 OpenAPI 활용 신청이 승인되었습니다.

승인키(API Key): ABC123XYZ456...
사용 가능 API: 국가R&D 과제검색 서비스(대국민용)
승인일: 2025-XX-XX
만료일: 2027-XX-XX
```

---

### Step 9: Configure Your Application

1. Copy your API key from the email

2. Add to `.env` file:
   ```env
   NTIS_API_KEY=ABC123XYZ456...
   ```

3. Test the connection:
   ```bash
   npx tsx scripts/trigger-ntis-scraping.ts
   ```

4. If successful, you'll see:
   ```
   ✅ Found XXX programs from NTIS API
   ✅ NTIS API scraping completed
   ```

---

## 📊 API Usage Limits

### Public API (대국민용)

| Limit Type | Value |
|------------|-------|
| Requests per minute | 10 |
| Requests per day | 1,000 |
| Results per request | 100 |
| Concurrent requests | 3 |

### Enterprise API (기관용)

If you need higher limits, apply for the **기관용** (Enterprise) API:

| Limit Type | Value |
|------------|-------|
| Requests per minute | 30 |
| Requests per day | 5,000 |
| Results per request | 100 |
| Concurrent requests | 10 |

**Requirements for Enterprise API:**
- Must be a registered organization
- Business registration number required
- Official request letter
- Approval takes 3-5 business days

---

## 🔐 API Key Security

### DO:
✅ Store in `.env` file  
✅ Add `.env` to `.gitignore`  
✅ Use environment variables in production  
✅ Rotate keys periodically (every 6-12 months)  
✅ Monitor usage for anomalies

### DON'T:
❌ Commit API keys to version control  
❌ Share keys publicly  
❌ Hard-code in source files  
❌ Use production keys in development  
❌ Include in client-side code

---

## 🚨 Troubleshooting Application

### Application Rejected

**Possible reasons:**
1. Incomplete information
2. Unclear purpose
3. Unrealistic usage estimates
4. Missing contact information

**Solution:**
- Review and resubmit with more details
- Contact NTIS support: ntis@kisti.re.kr

---

### No Response After 3 Days

**Actions:**
1. Check spam/junk email folder
2. Call NTIS Help Desk: 042-869-1115
3. Check application status in "My Page"

---

### Need Higher Limits

**Option 1**: Apply for Enterprise API (기관용)

**Option 2**: Request limit increase
- Email: ntis@kisti.re.kr
- Subject: "OpenAPI 사용량 증가 요청"
- Include:
  - Current API key
  - Current usage statistics
  - Reason for increase
  - New estimated usage

---

## 📞 Support Contacts

### NTIS Help Desk
- **Phone**: 042-869-1115
- **Email**: ntis@kisti.re.kr
- **Hours**: 09:00-18:00 (Weekdays, KST)

### OpenAPI Support
- **URL**: https://www.ntis.go.kr/ThNewBoardList.do?boardDivCd=01
- **FAQ**: https://www.ntis.go.kr/rndopen/api/mng/apiMain.do

---

## 📝 Application Template

Copy and use this template for your application:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NTIS OpenAPI 활용 신청서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[서비스 정보]
서비스명: Connect - R&D Matching Platform
서비스 유형: 웹 플랫폼
서비스 URL: https://connect.example.com

[활용 목적]
본 플랫폼은 국내 R&D 과제와 기업/연구기관을 AI 기반으로 
매칭하는 서비스입니다. NTIS API를 통해 실시간 R&D 공고 
정보를 수집하고, 사용자의 프로필과 매칭하여 맞춤형 
R&D 기회를 제공합니다.

주요 활용 사항:
- R&D 과제 공고 정보 수집 및 분석
- 기업/연구기관 프로필과의 자동 매칭
- 사용자 알림 및 추천 서비스

[예상 이용량]
일일 요청: 평균 100건, 피크 200건
주요 사용 시간: 09:00, 15:00 (자동 스케줄링)
월간 예상: 약 3,000-6,000건

[이용 기간]
시작일: 2025-01-01
종료일: 2027-12-31 (2년, 연장 가능)

[담당자 정보]
성명: [Your Name]
소속: [Your Organization]
직위: [Your Position]
이메일: [your.email@example.com]
연락처: [010-XXXX-XXXX]

[기타 사항]
- API 사용 로그 기록 및 관리
- 보안 정책 준수
- 월간 사용 리포트 제출 가능

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Post-Approval Checklist

After receiving your API key:

- [ ] Save API key securely in `.env`
- [ ] Add `.env` to `.gitignore`
- [ ] Test API connection
- [ ] Document usage internally
- [ ] Set up monitoring
- [ ] Schedule regular scraping
- [ ] Configure rate limiting
- [ ] Set up error alerting
- [ ] Create usage reports
- [ ] Review data compliance

---

## 🎯 Next Steps

1. **Apply for API key** using the steps above
2. **Test with demo key** while waiting for approval
3. **Set up monitoring** for usage tracking
4. **Schedule scraping** for optimal data freshness
5. **Monitor and optimize** based on results

---

**Good luck with your application! 🚀**

If you encounter any issues, refer to the troubleshooting section or contact NTIS support.
