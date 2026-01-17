# Connect Landing Page Optimization Plan
## UI/UX Team Work Brief | Version 1.0

**Document Date**: November 28, 2025
**Prepared by**: CMO Office
**Target File**: `app/page.tsx`
**Priority**: High
**Estimated Effort**: 2-4 hours

---

## 1. Executive Summary

Based on CMO review of the production landing page (connectplt.kr), this document outlines three targeted optimizations to improve conversion rates and build user trust. The changes focus on removing metrics that undermine credibility and enhancing CTA effectiveness.

---

## 2. Change Request Overview

| ID | Change | Priority | Type | Lines Affected |
|----|--------|----------|------|----------------|
| CR-01 | Remove Beta Stats Section | 🔴 High | Deletion | 354-374 |
| CR-02 | Update Section Header | 🟡 Medium | Edit | 376-381 |
| CR-03 | Add Bottom CTA Animation | 🟢 Low | Enhancement | 454-461 |

---

## 3. Detailed Change Specifications

### CR-01: Remove Beta Stats Section 🔴 HIGH PRIORITY

**Rationale**:
Current metrics (50 Beta Users, 38% Match Quality) actively harm conversion by signaling an unproven product. These numbers are below the threshold needed to inspire confidence.

**Current State** (Lines 354-374):
```tsx
{/* Beta Stats */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 max-w-4xl mx-auto">
  <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
    <div className="text-4xl font-bold text-blue-600 mb-2">50</div>
    <div className="text-sm text-gray-600">Beta Users</div>
  </div>
  <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
    <div className="text-4xl font-bold text-green-600 mb-2">200-500</div>
    <div className="text-sm text-gray-600">Active Programs</div>
  </div>
  <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
    <div className="text-4xl font-bold text-purple-600 mb-2">4</div>
    <div className="text-sm text-gray-600">Major Agencies</div>
  </div>
  <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
    <div className="text-4xl font-bold text-orange-600 mb-2">38%</div>
    <div className="text-sm text-gray-600">Avg Match Quality</div>
  </div>
</div>
```

**Target State**:
DELETE entire block. The NTIS Trust Indicators section (Lines 165-182) provides stronger social proof.

**Acceptance Criteria**:
- [ ] Beta Stats grid completely removed
- [ ] No visual gap or spacing issues after removal
- [ ] Section flows naturally from gray background to header

---

### CR-02: Update Section Header 🟡 MEDIUM PRIORITY

**Rationale**:
With Beta Stats removed, the section header should connect directly to the User Expectation cards. The current subheader "실제 사용자들의 기대와 목표" is appropriate and should be retained.

**Current State** (Lines 376-381):
```tsx
<div className="text-center mb-16">
  <h2 className="text-4xl font-bold text-gray-900 mb-4">
    Connect가 제공하는 가치
  </h2>
  <p className="text-lg text-gray-600">실제 사용자들의 기대와 목표</p>
</div>
```

**Target State**:
```tsx
<div className="text-center mb-16">
  <h2 className="text-4xl font-bold text-gray-900 mb-4">
    Connect가 제공하는 가치
  </h2>
  <p className="text-lg text-gray-600">
    기업, 대학, 연구소가 Connect에 기대하는 것
  </p>
</div>
```

**Design Notes**:
- Subheader text change makes the value proposition clearer
- Emphasizes the three target personas (기업/대학/연구소) matching the cards below

**Acceptance Criteria**:
- [ ] Subheader updated to new copy
- [ ] Typography and spacing unchanged
- [ ] Visual hierarchy maintained

---

### CR-03: Add Bottom CTA Pulse Animation 🟢 LOW PRIORITY

**Rationale**:
Users who scroll to the bottom of the page have demonstrated high intent. A subtle animation draws attention without being aggressive, increasing click-through rate.

**Current State** (Lines 454-461):
```tsx
<Link
  href="/auth/signin"
  className="inline-flex items-center justify-center px-10 py-5 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 text-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
  aria-label="무료로 시작하기"
>
```

**Target State**:
```tsx
<Link
  href="/auth/signin"
  className="inline-flex items-center justify-center px-10 py-5 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 text-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 animate-subtle-pulse"
  aria-label="무료로 시작하기"
>
```

**Required CSS Addition** (in `globals.css` or Tailwind config):
```css
@keyframes subtle-pulse {
  0%, 100% {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  50% {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
                0 0 0 4px rgba(255, 255, 255, 0.3);
  }
}

.animate-subtle-pulse {
  animation: subtle-pulse 2s ease-in-out infinite;
}
```

**Design Notes**:
- Animation should be subtle (not flashy or distracting)
- 2-second cycle provides gentle rhythm
- Only affects bottom CTA, not hero CTA (intentional differentiation)

**Acceptance Criteria**:
- [ ] Subtle pulse animation visible on bottom CTA
- [ ] Animation does not interfere with hover states
- [ ] Animation respects `prefers-reduced-motion` media query
- [ ] Hero CTA remains static (no animation)

---

## 4. Visual Reference

### Before (Current)
```
┌─────────────────────────────────────────────────┐
│  User Expectations Section (bg-gray-50)         │
├─────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ 50  │ │200- │ │  4  │ │ 38% │  ← REMOVE     │
│  │Beta │ │ 500 │ │Agcy │ │Match│               │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                 │
│       "Connect가 제공하는 가치"                  │
│       "실제 사용자들의 기대와 목표"              │
│                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 기업    │ │ 대학    │ │ 연구소  │           │
│  │ 사용자  │ │ 사용자  │ │ 사용자  │           │
│  └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────┘
```

### After (Target)
```
┌─────────────────────────────────────────────────┐
│  User Expectations Section (bg-gray-50)         │
├─────────────────────────────────────────────────┤
│                                                 │
│       "Connect가 제공하는 가치"                  │
│   "기업, 대학, 연구소가 Connect에 기대하는 것"   │  ← UPDATED
│                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 기업    │ │ 대학    │ │ 연구소  │           │
│  │ 사용자  │ │ 사용자  │ │ 사용자  │           │
│  └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────┘
```

---

## 5. Testing Checklist

### Functional Testing
- [ ] Landing page loads without errors
- [ ] Both CTA buttons link correctly to `/auth/signin`
- [ ] Smooth scroll to "How It Works" section works
- [ ] All images and icons render correctly

### Visual Testing
- [ ] No layout shifts after Beta Stats removal
- [ ] Section spacing looks natural
- [ ] Bottom CTA animation is subtle, not distracting
- [ ] Mobile responsiveness maintained (test 375px, 768px, 1024px)

### Accessibility Testing
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Focus states visible on all interactive elements
- [ ] Screen reader testing for updated section header

---

## 6. Deployment Notes

**File Modified**: `app/page.tsx`
**Additional Files** (if CR-03 implemented):
- `app/globals.css` OR `tailwind.config.ts`

**Deployment Process**:
1. Complete changes in local environment
2. Test locally with `npm run dev`
3. Build verification: `npm run build`
4. Commit and push to trigger CI/CD
5. Verify on production (connectplt.kr)

---

## 7. Future Considerations

When Connect achieves the following milestones, consider re-adding a metrics section:

| Metric | Threshold for Display |
|--------|----------------------|
| Users | 500+ |
| Match Quality | 60%+ |
| Success Stories | 10+ verified |

At that point, metrics become powerful social proof rather than a liability.

---

## 8. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CMO | | | |
| UI/UX Lead | | | |
| Engineering Lead | | | |

---

*Document End*
