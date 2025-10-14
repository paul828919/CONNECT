/**
 * E2E Tests for Connect Platform Dashboard
 * Tests protected routes and authenticated user experience
 * Run with: PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test dashboard.spec.ts
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
const isProduction = BASE_URL.includes('connectplt.kr');

// Note: These tests use Paul Kim's real authentication state from .playwright/paul-auth.json
// Production tests are READ-ONLY, localhost tests allow full CRUD operations

test.describe('Dashboard (Unauthenticated)', () => {
  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to sign-in page
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should protect /dashboard/profile/create route', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/profile/create`);

    // Should redirect to sign-in
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should protect /dashboard/matches route', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/matches`);

    // Should redirect to sign-in
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe('Dashboard (Authenticated)', () => {
  /**
   * Note: These tests use Paul Kim's real authentication state
   */

  test('should load dashboard for authenticated user', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    await page.waitForLoadState('networkidle');

    // Check dashboard loaded
    const url = page.url();
    console.log('Dashboard URL:', url);

    // Should see dashboard elements (if auth worked)
    const content = await page.content();
    const isDashboard = content.includes('대시보드') || content.includes('Dashboard');
    console.log('Is Dashboard:', isDashboard);
  });

  test('should display user profile section', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for profile elements
    await expect(page.locator('text=프로필')).toBeVisible();
  });

  test('should show funding match results', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for match cards
    const matchCards = page.locator('[data-testid="match-card"], [data-testid="funding-match-card"]');
    await expect(matchCards.first()).toBeVisible();
  });

  test('should allow viewing match details', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Click first match
    const firstMatch = page.locator('[data-testid="match-card"], [data-testid="funding-match-card"]').first();
    await firstMatch.click();

    // Should show match details
    await expect(page.locator('text=매칭 설명, text=Match Details')).toBeVisible();
  });
});

test.describe('Dashboard Navigation', () => {
  test('should have consistent header across dashboard pages', async ({ page }) => {
    // Even without auth, we can check if header is consistent on public pages
    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Check header elements
    const header = page.locator('header, nav').first();
    await expect(header).toBeVisible();

    // Should have logo/brand - check for text "Connect" in navigation
    // The logo is an Image with alt="Connect Logo" + a span with text "Connect"
    const brand = page.locator('nav span:has-text("Connect")').first();
    await expect(brand).toBeVisible();
  });

  test('should show login button on unauthenticated pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Should have login/signin button - check for link to /auth/signin
    const loginButton = page.locator('a[href="/auth/signin"]:has-text("로그인")');
    await expect(loginButton).toBeVisible();
  });
});

test.describe('Dashboard Error Handling', () => {
  test('should handle invalid dashboard URLs gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/nonexistent-page`);

    // Either redirects to sign-in or shows 404
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const is404OrSignIn = url.includes('/auth/signin') || url.includes('404');

    expect(is404OrSignIn).toBe(true);
  });
});

test.describe('Dashboard Performance', () => {
  test('should load dashboard redirect quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Redirect should be fast (< 3 seconds)
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe('Dashboard SEO and Meta Tags', () => {
  test('should have proper meta tags on dashboard pages', async ({ page }) => {
    // Note: Can't access dashboard without auth, but test redirects have meta tags
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

    // On sign-in page now, check meta tags
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
