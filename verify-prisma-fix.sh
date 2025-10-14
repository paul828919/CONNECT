#!/bin/bash

# Session 26: Prisma Schema Fix Verification Script
# This script regenerates the Prisma client and runs type checking

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Session 26: Prisma Schema Fix Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Regenerate Prisma Client
echo "📦 Step 1: Regenerating Prisma Client..."
echo "Running: npm run db:generate"
echo ""
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
echo "Running: npm run type-check 2>&1 | tee type-check-results.txt"
echo ""

# Capture both stdout and stderr, and save to file
npm run type-check 2>&1 | tee type-check-results.txt

# Count errors
ERROR_COUNT=$(grep -c "error TS" type-check-results.txt || echo "0")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Previous Error Count: 97"
echo "Current Error Count:  $ERROR_COUNT"
echo ""

if [ "$ERROR_COUNT" -lt 97 ]; then
  REDUCTION=$((97 - ERROR_COUNT))
  echo "✅ SUCCESS! Reduced errors by $REDUCTION"
  echo "🎉 Error reduction: $((REDUCTION * 100 / 97))%"
else
  echo "⚠️  No error reduction detected"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: Show Detailed Changes
echo "📋 Changes Made to Prisma Schema:"
echo ""
echo "✅ Added @default(cuid()) to 4 models:"
echo "   - accounts"
echo "   - contact_requests"
echo "   - consortium_projects"
echo "   - consortium_members"
echo ""
echo "✅ Added @updatedAt to 9 models:"
echo "   - contact_requests"
echo "   - consortium_projects"
echo "   - consortium_members"
echo "   - funding_programs"
echo "   - organizations"
echo "   - payments"
echo "   - subscriptions"
echo "   - users"
echo "   - feedback"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$ERROR_COUNT" -eq 0 ]; then
  echo "🎯 TARGET ACHIEVED: 0 ERRORS!"
  echo "✅ All TypeScript errors have been resolved!"
  exit 0
elif [ "$ERROR_COUNT" -lt 97 ]; then
  echo "✅ Significant progress made!"
  echo "📝 Full results saved to: type-check-results.txt"
  exit 0
else
  echo "⚠️  Further investigation needed"
  echo "📝 Full results saved to: type-check-results.txt"
  exit 1
fi
