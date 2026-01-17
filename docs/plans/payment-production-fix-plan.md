# Payment System Production Fix - Root Cause Analysis & Work Plan

## 1. Error Symptoms (Screenshots)

**Screenshot 1:** Browser alert "결제 설정이 완료되지 않았습니다" (Payment setup was not completed)
- Console shows: "Billing auth error" from `toss-billing-widget.tsx:160`

**Screenshot 2:** Detailed Console errors showing:
- "Billing auth error: Error: 알 수 없는 이유로 결제에 실패했습니다"
- Multiple error traces from payment widget components

---

## 2. Root Cause Analysis

### 2.1 Direct Cause
The error originates from `components/toss-billing-widget.tsx:133-136`:

```typescript
const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

if (!clientKey) {
  throw new Error('결제 설정이 완료되지 않았습니다.');
}
```

**`NEXT_PUBLIC_TOSS_CLIENT_KEY` is `undefined` in the production build.**

### 2.2 Root Cause: Build-Time vs Runtime Environment Variables

**Critical Next.js Behavior:**
- `NEXT_PUBLIC_*` environment variables are **inlined into the JavaScript bundle at BUILD time**
- They are NOT read from the environment at runtime
- Server-side variables can be provided at runtime, but client-side (`NEXT_PUBLIC_*`) CANNOT

### 2.3 Current Dockerfile.production (Lines 44-48)

```dockerfile
# Create empty .env file to satisfy Next.js build requirements
# Actual environment variables are provided at runtime via docker-compose
RUN touch .env       # <-- EMPTY FILE

RUN npm run build    # <-- Builds with NEXT_PUBLIC_TOSS_CLIENT_KEY=undefined
```

**Problem:** The Dockerfile creates an EMPTY `.env` file before running the build. The `NEXT_PUBLIC_TOSS_CLIENT_KEY` is not available during the build step.

### 2.4 Current GitHub Actions Workflow (Lines 154-163)

```yaml
- name: Build production image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ./Dockerfile.production
    push: false
    tags: connect:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
    outputs: type=docker,dest=/tmp/connect-image.tar
    # ❌ NO build-args for NEXT_PUBLIC_* variables!
```

**Problem:** No `build-args` are passed to provide client-side environment variables during the Docker build.

### 2.5 Why .env.production at Runtime Doesn't Help

The workflow generates `.env.production` at runtime (line 400):
```yaml
NEXT_PUBLIC_TOSS_CLIENT_KEY=${{ secrets.NEXT_PUBLIC_TOSS_CLIENT_KEY }}
```

But this file is only mounted when the container **runs**, not when it **builds**. By then, `undefined` is already hardcoded into the JavaScript bundle.

### 2.6 Why Local Development Works

- `next dev` reads `.env.local` at startup
- Hot reloading recompiles with current environment variables
- The development server has access to `NEXT_PUBLIC_TOSS_CLIENT_KEY` when compiling

---

## 3. Solution Architecture

### Option A: Docker Build Arguments (Recommended)

Pass `NEXT_PUBLIC_*` variables as Docker build arguments.

**Pros:**
- Industry standard approach
- Clean separation of build-time vs runtime config
- Secrets stay in GitHub Secrets

**Cons:**
- Variables are baked into the image (cannot change without rebuild)
- Must rebuild image for client key rotation

### Option B: Multi-stage Build with .env File

Copy the actual .env file during build instead of creating empty one.

**Cons:**
- Requires the secrets to be written to a file in the GitHub Actions runner
- Less secure (file in filesystem even temporarily)

### Option C: Next.js Runtime Configuration (Not Applicable)

`publicRuntimeConfig` in `next.config.js` doesn't work for environment variables accessed via `process.env.NEXT_PUBLIC_*`.

**Recommendation: Option A (Docker Build Arguments)**

---

## 4. Implementation Plan

### Step 1: Modify Dockerfile.production

Add ARG/ENV for client-side environment variables before the build step:

```dockerfile
# ========== Stage 2: Builder ==========
FROM node:20-slim AS builder
# ... existing code ...

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# =============================================
# NEW: Client-side environment variables (build-time)
# These are inlined into the JavaScript bundle by Next.js
# =============================================
ARG NEXT_PUBLIC_TOSS_CLIENT_KEY
ARG NEXT_PUBLIC_TOSS_TEST_MODE
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_TOSS_CLIENT_KEY=$NEXT_PUBLIC_TOSS_CLIENT_KEY
ENV NEXT_PUBLIC_TOSS_TEST_MODE=$NEXT_PUBLIC_TOSS_TEST_MODE
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# =============================================

# Create empty .env file to satisfy Next.js build requirements
# Server-side variables are provided at runtime via docker-compose
RUN touch .env

RUN npm run build
```

### Step 2: Modify GitHub Actions Workflow

Add `build-args` to pass the secrets during Docker build:

```yaml
- name: Build production image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ./Dockerfile.production
    push: false
    tags: connect:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
    outputs: type=docker,dest=/tmp/connect-image.tar
    # NEW: Pass client-side environment variables as build arguments
    build-args: |
      NEXT_PUBLIC_TOSS_CLIENT_KEY=${{ secrets.NEXT_PUBLIC_TOSS_CLIENT_KEY }}
      NEXT_PUBLIC_TOSS_TEST_MODE=${{ secrets.NEXT_PUBLIC_TOSS_TEST_MODE }}
      NEXT_PUBLIC_APP_URL=https://connectplt.kr
```

### Step 3: Verify GitHub Secrets Exist

Ensure these secrets are configured in GitHub repository settings:
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` (Toss Payments client key)
- `NEXT_PUBLIC_TOSS_TEST_MODE` (should be `false` for production)

### Step 4: Local Verification

Before deployment, verify locally:

```bash
# Build with build args (simulating CI/CD)
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_TOSS_CLIENT_KEY=test_xxx \
  --build-arg NEXT_PUBLIC_TOSS_TEST_MODE=true \
  --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  -f Dockerfile.production -t connect:test .

# Run and check env in browser console
docker run --rm -p 3000:3000 connect:test
```

### Step 5: Deployment

1. Commit and push changes
2. GitHub Actions will rebuild with the secrets
3. Deploy to production
4. Verify payment flow on https://connectplt.kr/pricing

---

## 5. Files to Modify

| File | Change Required |
|------|-----------------|
| `Dockerfile.production` | Add ARG/ENV for `NEXT_PUBLIC_*` variables |
| `.github/workflows/deploy-production.yml` | Add `build-args` to Docker build step |

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Build failure due to syntax error | Test locally first |
| Secrets not configured in GitHub | Verify in repository settings before deployment |
| Cache invalidation needed | GitHub Actions cache may need clearing if old image persists |

---

## 7. Rollback Plan

If issues occur after deployment:
1. Revert the commit in GitHub
2. Force push to main to trigger rollback deployment
3. Or: SSH into production server and manually restart with previous image

---

## 8. Verification Checklist

- [ ] Dockerfile.production updated with ARG/ENV for client-side variables
- [ ] GitHub Actions workflow updated with build-args
- [ ] GitHub Secrets verified to exist
- [ ] Local Docker build tested successfully
- [ ] Deployed to production
- [ ] Payment flow tested on production pricing page
- [ ] No "결제 설정이 완료되지 않았습니다" error
- [ ] Toss payment modal opens successfully

---

## 9. Timeline Estimate

| Task | Duration |
|------|----------|
| Code changes | 10 minutes |
| Local verification | 10-15 minutes |
| GitHub Secrets verification | 5 minutes |
| Deployment (CI/CD) | ~12 minutes |
| Production testing | 5 minutes |
| **Total** | **~45 minutes** |

---

## 10. Technical Reference

### Why `NEXT_PUBLIC_*` Variables Are Special

From Next.js documentation:
> "In order to expose a variable to the browser you have to prefix the variable with `NEXT_PUBLIC_`. These environment variables are **inlined into the JavaScript sent to the browser** at build time."

This means:
- Variables are replaced with their actual values during `next build`
- They become static strings in the compiled JavaScript
- Changing the variable at runtime has NO effect
- Must rebuild to update client-side environment variables
