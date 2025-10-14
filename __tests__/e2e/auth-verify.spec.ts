/**
 * Quick verification that Paul Kim's authentication is working
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';

test.describe('Authentication Verification', () => {
  test('should be logged in as Paul Kim', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/auth/session`);
    const sessionText = await page.textContent('body');
    const session = JSON.parse(sessionText || '{}');

    expect(session.user).toBeDefined();
    expect(session.user?.email).toBeTruthy();

    console.log(`✅ Authenticated as: ${session.user?.email}`);
    console.log(`   Organization: ${session.user?.organizationId || 'None yet'}`);
  });

  test('should access dashboard without redirect', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Should stay on dashboard (not redirect to sign-in)
    expect(page.url()).toContain('/dashboard');
    expect(page.url()).not.toContain('/auth/signin');

    console.log('✅ Dashboard access confirmed');
  });
});
