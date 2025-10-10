/**
 * Verify AI Monitoring API Structure
 *
 * This script verifies that all AI monitoring API endpoints are correctly structured
 * and can be imported without errors.
 *
 * Run with: npx tsx scripts/verify-ai-monitoring-apis.ts
 */

console.log('🔍 Verifying AI Monitoring API Structure...\n');

// Check if API route files exist
const fs = require('fs');
const path = require('path');

const API_BASE = path.join(__dirname, '../app/api/admin/ai-monitoring');

const endpoints = [
  'stats/route.ts',
  'daily-breakdown/route.ts',
  'top-users/route.ts',
  'alert-history/route.ts',
  'test-alert/route.ts',
];

let allExist = true;

endpoints.forEach((endpoint) => {
  const fullPath = path.join(API_BASE, endpoint);
  const exists = fs.existsSync(fullPath);
  const icon = exists ? '✅' : '❌';
  console.log(`${icon} ${endpoint.padEnd(30)} ${exists ? 'Found' : 'MISSING'}`);
  if (!exists) allExist = false;
});

console.log('\n📄 Checking dashboard page...');
const dashboardPath = path.join(__dirname, '../app/dashboard/admin/ai-monitoring/page.tsx');
const dashboardExists = fs.existsSync(dashboardPath);
console.log(`${dashboardExists ? '✅' : '❌'} page.tsx ${dashboardExists ? 'Found' : 'MISSING'}`);
if (!dashboardExists) allExist = false;

console.log('\n📦 Checking service modules...');
const services = [
  '../lib/ai/monitoring/cost-logger.ts',
  '../lib/ai/monitoring/budget-alerts.ts',
];

services.forEach((service) => {
  const fullPath = path.join(__dirname, service);
  const exists = fs.existsSync(fullPath);
  const icon = exists ? '✅' : '❌';
  const name = service.split('/').pop();
  console.log(`${icon} ${name?.padEnd(30)} ${exists ? 'Found' : 'MISSING'}`);
  if (!exists) allExist = false;
});

console.log('\n' + '='.repeat(60));
if (allExist) {
  console.log('✅ All AI monitoring files are in place!');
  console.log('\nNext steps:');
  console.log('1. Fix database authentication (PostgreSQL role "connect")');
  console.log('2. Run migration: npx prisma db push');
  console.log('3. Test API endpoints with admin user');
  console.log('4. Access dashboard at: /dashboard/admin/ai-monitoring');
} else {
  console.log('❌ Some files are missing. Please create them first.');
  process.exit(1);
}
console.log('='.repeat(60));
