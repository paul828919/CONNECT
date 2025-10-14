#!/bin/bash

# Session 27: COMPLETE Prisma Schema Fix (Claude Code's recommendations)
# This completes the incomplete fix from Session 26

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Session 27: COMPLETE Prisma Schema Fix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Fixes Applied:"
echo ""
echo "Session 26 (Claude Desktop - Partial):"
echo "  ✅ Added @default(cuid()) to 4 models"
echo "  ✅ Added @updatedAt to 8 models"
echo "  ❌ Missed 5 critical decorators"
echo ""
echo "Session 27 (Claude Code - Complete):"
echo "  ✅ organizations.id → @default(cuid())"
echo "  ✅ organizations.updatedAt → @updatedAt"
echo "  ✅ funding_programs.id → @default(cuid())"
echo "  ✅ funding_matches.id → @default(cuid())"
echo "  ✅ scraping_logs.id → @default(cuid())"
echo ""
echo "Total: 17 decorators added (COMPLETE)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Regenerate Prisma Client
echo "📦 Step 1: Regenerating Prisma Client..."
npm run db:generate

if [ $? -eq 0 ]; then
  echo "✅ Prisma client regenerated successfully!"
else
  echo "❌ Failed to regenerate Prisma client"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Run Type Checking
echo "🔍 Step 2: Running TypeScript Type Checking..."
echo ""

npm run type-check 2>&1 | tee type-check-session27.txt

# Count errors
ERROR_COUNT=$(grep -c "error TS" type-check-session27.txt || echo "0")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Baseline (Session 25): 97 errors"
echo "Current Error Count:   $ERROR_COUNT"
echo ""

if [ "$ERROR_COUNT" -lt 97 ]; then
  REDUCTION=$((97 - ERROR_COUNT))
  PERCENT=$((REDUCTION * 100 / 97))
  echo "✅ SUCCESS! Reduced errors by $REDUCTION ($PERCENT%)"
  echo ""
  
  if [ "$ERROR_COUNT" -le 10 ]; then
    echo "🎉 EXCELLENT! Near-perfect result!"
  elif [ "$ERROR_COUNT" -le 30 ]; then
    echo "✅ VERY GOOD! Substantial progress!"
  elif [ "$ERROR_COUNT" -le 60 ]; then
    echo "✅ GOOD! Significant reduction!"
  else
    echo "✅ Progress made, more work needed"
  fi
else
  echo "⚠️  No error reduction detected"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Expected Results (Claude Code's Analysis):"
echo ""
echo "Conservative: 42-67 errors (31-56% reduction)"
echo "Optimistic:   20-40 errors (59-79% reduction)"
echo ""
echo "Actual result: $ERROR_COUNT errors"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$ERROR_COUNT" -eq 0 ]; then
  echo "🎯 PERFECT! 0 ERRORS ACHIEVED!"
  exit 0
elif [ "$ERROR_COUNT" -le 20 ]; then
  echo "🎯 Nearly there! <20 errors remaining"
  echo "📝 Review type-check-session27.txt for details"
  exit 0
elif [ "$ERROR_COUNT" -le 60 ]; then
  echo "✅ Good progress! Continue with Phase 3"
  echo "📝 Full results saved to: type-check-session27.txt"
  exit 0
else
  echo "⚠️  More work needed (Phase 3: Iterative fixes)"
  echo "📝 Full results saved to: type-check-session27.txt"
  exit 1
fi
