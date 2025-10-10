# Kakao OAuth Authentication - Test Guide

## ✅ Automated Tests Completed

### 1. Server Status
```
✓ Next.js server running on http://localhost:3000
✓ Environment variables loaded (.env)
✓ Server ready in 1106ms
```

### 2. OAuth Provider Configuration
```json
{
  "kakao": {
    "id": "kakao",
    "name": "Kakao",
    "type": "oauth",
    "signinUrl": "http://localhost:3000/api/auth/signin/kakao",
    "callbackUrl": "http://localhost:3000/api/auth/callback/kakao"
  }
}
```
**Result:** ✅ PASS - Kakao provider registered with NextAuth

### 3. Pages Compiled Successfully
```
✓ /auth/signin compiled (559 modules) - 1513ms
✓ /api/auth/[...nextauth] compiled (586 modules) - 241ms
✓ No compilation errors
```

### 4. Credentials Loaded
```
KAKAO_CLIENT_ID: kbj20415@hanmail.net
KAKAO_CLIENT_SECRET: vgjFmUt4TheMAm9m0J3hbyilGUk0GBOp
```
**Result:** ✅ PASS - OAuth credentials loaded from .env

---

## 🧪 Manual Testing Steps

### Step 1: Open Signin Page
1. Open browser and navigate to:
   ```
   http://localhost:3000/auth/signin
   ```

2. **Expected UI:**
   - "Connect" logo and title
   - "한국 R&D 생태계 매칭 플랫폼" subtitle
   - Yellow Kakao login button: "카카오로 시작하기"
   - Disabled Naver button: "네이버로 시작하기 (준비중)"
   - Feature stats: 55% budget coverage, 4 agencies, AI matching
   - Terms and privacy policy links

3. **Screenshot checkpoint:**
   - Page should match the design in `app/auth/signin/page.tsx`
   - Kakao button should have #FEE500 yellow background
   - Button should show Kakao chat bubble icon

---

### Step 2: Test Kakao OAuth Flow

1. **Click "카카오로 시작하기" button**

2. **Expected behavior:**
   - Browser redirects to Kakao authorization page
   - URL should be: `https://kauth.kakao.com/oauth/authorize`
   - Query parameters:
     - `client_id=kbj20415@hanmail.net`
     - `redirect_uri=http://localhost:3000/api/auth/callback/kakao`
     - `response_type=code`
     - `scope=profile_nickname profile_image account_email`

3. **Kakao Login Page:**
   - Should show Kakao's official login interface
   - Login with your Kakao account
   - If first time: Will ask for consent to share:
     - Profile nickname
     - Profile image
     - Email address

4. **After login:**
   - Kakao redirects back to: `http://localhost:3000/api/auth/callback/kakao?code=...`
   - NextAuth exchanges code for tokens
   - User account created in database
   - Session cookie set: `next-auth.session-token`

5. **Expected redirect:**
   - Should redirect to: `http://localhost:3000/dashboard/profile/create`
   - (Because user doesn't have organization profile yet)

---

### Step 3: Verify Database (After OAuth Login)

Open terminal and run:

```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Check user was created
psql -d connect -c "SELECT id, name, email, role, created_at FROM users WHERE email != 'admin@connect.kr' ORDER BY created_at DESC LIMIT 1;"

# Check session was created
psql -d connect -c "SELECT user_id, expires FROM sessions ORDER BY expires DESC LIMIT 1;"

# Check account linked
psql -d connect -c "SELECT provider, type, user_id FROM accounts ORDER BY created_at DESC LIMIT 1;"
```

**Expected output:**
- User record with your Kakao email
- Active session with future expiry date
- Account record with `provider='kakao'` and `type='oauth'`

---

### Step 4: Create Organization Profile

After redirect to `/dashboard/profile/create`:

1. **Fill the form:**
   - **조직 유형:** Click "기업" (Company)
   - **조직명:** Enter "(주)테스트기업"
   - **사업자등록번호:** Enter "123-45-67890"
   - **산업 분야:** Select "ICT (정보통신)"
   - **직원 수:** Select "10~50명"
   - **R&D 경험:** Check the checkbox ✓
   - **TRL:** Select "5 - 유사 환경 검증"
   - **조직 설명:** Enter "Kakao OAuth 인증 테스트를 위한 조직입니다."

2. **Click "프로필 생성" button**

3. **Expected behavior:**
   - Form validates (Zod schema)
   - POST request to `/api/organizations`
   - Loading spinner appears
   - Organization created with encryption

4. **Expected redirect:**
   - Should redirect to: `http://localhost:3000/dashboard`
   - Dashboard should show welcome message
   - User name and email in header
   - Stats: 0 matches, 8 active programs, Free plan

---

### Step 5: Verify Encryption in Database

After organization creation:

```bash
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Check organization was created
psql -d connect -c "
SELECT
  id,
  name,
  type,
  profile_score,
  profile_completed,
  length(business_number_encrypted) as encrypted_length,
  length(business_number_hash) as hash_length
FROM organizations
WHERE name = '(주)테스트기업';
"

# Verify business number is encrypted (not plaintext)
psql -d connect -c "
SELECT
  substring(business_number_encrypted, 1, 50) as encrypted_preview
FROM organizations
WHERE name = '(주)테스트기업';
"

# Check user is linked to organization
psql -d connect -c "
SELECT
  u.email,
  u.organization_id,
  o.name as org_name
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.email != 'admin@connect.kr';
"
```

**Expected output:**
```
name: (주)테스트기업
type: COMPANY
profile_score: 100 (or 95)
profile_completed: true
encrypted_length: 90
hash_length: 64

encrypted_preview: 1a2b3c4d5e6f7g8h:9i0j1k2l3m4n5o6p:...
(Should see hex string with colons, NOT "123-45-67890")

user email linked to organization ✓
```

---

### Step 6: Test Dashboard Access

1. **Dashboard page should show:**
   - Your Kakao profile name in header
   - Your Kakao email
   - Logout button
   - Welcome message: "환영합니다! 👋"
   - Stats:
     - 내 매칭: 0 (이번 달)
     - 활성 프로그램: 8 (4개 기관)
     - 구독 플랜: Free (3 매칭/월)

2. **Test logout:**
   - Click "로그아웃" button
   - Should redirect to `/auth/signin`
   - Session cookie cleared

3. **Test re-login:**
   - Click "카카오로 시작하기" again
   - Should login faster (Kakao remembers you)
   - Should redirect to `/dashboard` (NOT profile creation)
   - Organization info should persist

---

### Step 7: Test Protected Routes

1. **Test unauthenticated access:**
   ```bash
   # Open incognito/private browser window
   # Try to access: http://localhost:3000/dashboard
   ```
   **Expected:** Redirect to `/auth/signin`

2. **Test API protection:**
   ```bash
   curl -X POST http://localhost:3000/api/organizations \
     -H "Content-Type: application/json" \
     -d '{"type":"COMPANY","name":"Test"}'
   ```
   **Expected:** `{"error":"Unauthorized"}` (401)

---

## 🎯 Success Criteria

✅ **Authentication:**
- [ ] Kakao OAuth login successful
- [ ] User account created in database
- [ ] Session cookie set and valid
- [ ] Profile name and email displayed correctly

✅ **Organization Profile:**
- [ ] Form validation works (Zod schema)
- [ ] Business number encrypted (90 char string with colons)
- [ ] Business number hashed (64 char SHA-256)
- [ ] No plaintext business number in database
- [ ] Profile score calculated (80-100)
- [ ] User linked to organization

✅ **Dashboard:**
- [ ] User info displayed
- [ ] Stats accurate (0 matches, 8 programs, Free plan)
- [ ] Logout works
- [ ] Re-login redirects to dashboard (not profile creation)

✅ **Security:**
- [ ] Protected routes require authentication
- [ ] API endpoints return 401 without session
- [ ] Business numbers encrypted in database
- [ ] Session expires after 30 days

---

## 🐛 Troubleshooting

### Issue 1: "Invalid client_id" error on Kakao page
**Cause:** Client ID doesn't match Kakao Developer Console
**Fix:**
1. Check `.env` file: `KAKAO_CLIENT_ID`
2. Verify in Kakao Developer Console: App Settings > App Key > REST API Key
3. Should match exactly

---

### Issue 2: "Invalid redirect_uri" error
**Cause:** Redirect URI not registered in Kakao Developer Console
**Fix:**
1. Go to Kakao Developer Console
2. Product Settings > Kakao Login > Redirect URI
3. Add: `http://localhost:3000/api/auth/callback/kakao`
4. Save and try again

---

### Issue 3: User created but no redirect
**Cause:** Session not saved properly
**Fix:**
```bash
# Check session in database
psql -d connect -c "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1;"

# Check NextAuth secret is set
grep NEXTAUTH_SECRET .env

# Restart dev server
npm run dev
```

---

### Issue 4: "이미 등록된 사업자등록번호입니다" error
**Cause:** Business number already used by test organization
**Fix:**
```bash
# Delete test organization
psql -d connect -c "DELETE FROM organizations WHERE business_number_hash = '32d29c0fcf517a61733bdeb48c389fe4a56c55a4b3b0fc7607e2e5c44d61cd46';"

# Try creating profile again with same number
```

---

### Issue 5: Page shows "로딩 중..." indefinitely
**Cause:** Session provider not working
**Fix:**
1. Check browser console for errors (F12)
2. Verify `app/layout.tsx` has `<SessionProvider>` wrapper
3. Clear browser cookies and try again

---

## 📊 Test Results Template

Copy and fill after testing:

```markdown
## Test Results: [Date/Time]

### OAuth Authentication
- [ ] Kakao login redirects correctly
- [ ] User account created: [email]
- [ ] Session active: [YES/NO]

### Organization Profile
- [ ] Form submission successful
- [ ] Business number encrypted: [YES/NO]
- [ ] Profile score: [0-100]
- [ ] User linked: [YES/NO]

### Dashboard
- [ ] User info displayed: [YES/NO]
- [ ] Stats accurate: [YES/NO]
- [ ] Logout works: [YES/NO]

### Security
- [ ] Protected routes blocked: [YES/NO]
- [ ] API returns 401: [YES/NO]
- [ ] Encryption verified: [YES/NO]

### Issues Found
[List any issues encountered]

### Overall Status
[ ] PASS - All tests successful
[ ] FAIL - [Describe failures]
```

---

## 🎉 Next Steps After Successful Test

1. **Add Naver OAuth** (similar implementation)
2. **Build matching algorithm** (`lib/matching/algorithm.ts`)
3. **Create match results API** (`/api/matches/generate`)
4. **Implement rate limiting** (free tier: 3 matches/month)
5. **Add Redis caching** (for match results)

---

**Test Guide Version:** 1.0
**Last Updated:** 2025-09-30
**Server:** http://localhost:3000
**Status:** Ready for manual testing