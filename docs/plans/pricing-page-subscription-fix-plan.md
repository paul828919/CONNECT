# Pricing Page Subscription Display Fix Plan

## Issue Summary
- **Dashboard**: Shows "PRO" (correct - fetches from `/api/subscriptions/me`)
- **Pricing**: Shows "Free" as current plan (incorrect - hardcoded, no API call)

## Root Cause
The pricing page (`app/pricing/page.tsx`) does NOT dynamically fetch the user's subscription status. It has hardcoded logic that assumes all users are on Free plan.

## Solution Approach

### Phase 1: Fetch User's Current Subscription
**File**: `app/pricing/page.tsx`

1. Add state for current subscription:
```typescript
const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
const [loadingSubscription, setLoadingSubscription] = useState(false);
```

2. Fetch subscription on mount (when user is authenticated):
```typescript
useEffect(() => {
  if (session?.user) {
    fetchCurrentSubscription();
  }
}, [session]);

const fetchCurrentSubscription = async () => {
  setLoadingSubscription(true);
  try {
    const res = await fetch('/api/subscriptions/me');
    if (res.ok) {
      const data = await res.json();
      // subscription.plan is 'FREE', 'PRO', or 'TEAM'
      // If null, user is on Free plan
      setCurrentPlan(data.subscription?.plan || 'FREE');
    }
  } catch (error) {
    console.error('Error fetching subscription:', error);
    setCurrentPlan('FREE'); // Default to Free on error
  } finally {
    setLoadingSubscription(false);
  }
};
```

### Phase 2: Dynamic CTA Button Logic
**File**: `app/pricing/page.tsx`

1. Remove hardcoded `cta` from plans array
2. Create dynamic CTA function:
```typescript
const getCtaText = (planKey: Plan) => {
  if (!currentPlan) return 'Loading...';

  if (planKey === currentPlan) {
    return '현재 플랜';
  }

  // Current plan ordering: FREE < PRO < TEAM
  const planOrder = { FREE: 0, PRO: 1, TEAM: 2 };

  if (planOrder[planKey] > planOrder[currentPlan]) {
    return planKey === 'PRO' ? 'Pro 시작하기' : 'Team 시작하기';
  }

  return '다운그레이드'; // If going from higher to lower plan
};

const isCurrentPlan = (planKey: Plan) => planKey === currentPlan;
```

### Phase 3: Update Button Rendering
**File**: `app/pricing/page.tsx`

1. Update disabled logic:
```typescript
disabled={isCurrentPlan(plan.key) || isLoading}
```

2. Update button styling for current plan:
```typescript
className={`... ${
  isCurrentPlan(plan.key)
    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
    : colors.button
}`}
```

### Phase 4: Visual Indicator for Current Plan
Add a badge/indicator to clearly show which plan the user is currently on:
```typescript
{isCurrentPlan(plan.key) && (
  <div className="absolute -top-4 right-4">
    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
      현재 구독 중
    </span>
  </div>
)}
```

## Files to Modify
1. `app/pricing/page.tsx` - Main changes (subscription fetch + dynamic CTA)

## Testing Checklist
- [ ] Free user sees "현재 플랜" on Free card, "Pro 시작하기" on Pro card
- [ ] Pro user sees "다운그레이드" on Free card, "현재 플랜" on Pro card
- [ ] Team user sees "다운그레이드" on Free/Pro cards, "현재 플랜" on Team card
- [ ] Non-authenticated user sees generic CTAs (no "현재 플랜")
- [ ] Loading state handled gracefully

## Risk Assessment
- **Low risk**: Changes isolated to pricing page UI logic
- **No database changes**: Uses existing `/api/subscriptions/me` endpoint
- **Backward compatible**: Same API, just utilizing it on pricing page

## Estimated Effort
- Implementation: 30-45 minutes
- Testing: 15-20 minutes
- Total: ~1 hour
