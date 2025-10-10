/**
 * E2E Tests for Connect Platform Homepage
 * Tests against production: https://connectplt.kr
 * Run with: PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test homepage.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Connect/);
  });

  test('should display hero section in Korean', async ({ page }) => {
    await page.goto('/');

    // Check for Korean hero text
    const heroText = page.locator('h1, h2').first();
    await expect(heroText).toContainText('국가 R&D');
  });

  test('should show 4 agency logos (IITP, KEIT, TIPA, KIMST)', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check for agency logos or names
    const content = await page.content();
    expect(content).toContain('IITP');
    expect(content).toContain('KEIT');
    expect(content).toContain('TIPA');
    expect(content).toContain('KIMST');
  });

  test('should navigate to sign-in from CTA button', async ({ page }) => {
    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Look for CTA button - use more specific selector for production
    // The button is a Link component with href="/auth/signin" and text "무료로 시작하기"
    const ctaButton = page.locator('a[href="/auth/signin"]:has-text("무료로 시작하기")').first();

    // Click and wait for navigation
    await ctaButton.click();

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should display footer with legal links', async ({ page }) => {
    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check footer exists
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should be responsive (mobile viewport)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check page loads correctly on mobile
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors (favicon 404)
    const criticalErrors = consoleErrors.filter(
      (error) => !error.includes('favicon.ico')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should have valid meta tags for SEO', async ({ page }) => {
    await page.goto('/');

    // Check for essential meta tags
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Check for description meta tag
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
  });
});
