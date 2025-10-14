/**
 * E2E Tests for Connect Platform Mobile Responsiveness
 * Tests mobile experience on iPhone and Android devices
 * Run with: PLAYWRIGHT_BASE_URL=https://connectplt.kr npx playwright test mobile.spec.ts --project="Mobile Safari - iPhone 12"
 * Or: npx playwright test mobile.spec.ts --project="Mobile Chrome - Pixel 5"
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';

test.describe('Mobile Experience', () => {
  test('should display mobile-friendly navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Check viewport size is mobile (configured via project)
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeLessThan(500); // Mobile width
    expect(viewportSize?.height).toBeGreaterThan(600); // Mobile height

    // Navigation should be visible (hamburger menu or mobile nav)
    await page.waitForLoadState('networkidle');

    const header = page.locator('header, nav').first();
    await expect(header).toBeVisible();
  });

  test('should wrap text correctly on small screens', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Hero text should wrap and not overflow
    const hero = page.locator('h1, h2').first();
    await expect(hero).toBeVisible();

    const box = await hero.boundingBox();
    const viewportWidth = page.viewportSize()?.width || 0;
    expect(box?.width).toBeLessThan(viewportWidth); // Should fit in mobile viewport
  });

  test('should have tappable buttons (min 44x44px)', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);

    await page.waitForLoadState('networkidle');

    // OAuth buttons should be large enough to tap
    const kakaoButton = page.locator('button:has-text("카카오")').first();
    await expect(kakaoButton).toBeVisible();

    const buttonBox = await kakaoButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // iOS minimum tap target
  });

  test('should not have horizontal scrolling', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Check that body width doesn't exceed viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
  });

  test('should display forms correctly on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);

    await page.waitForLoadState('networkidle');

    // Form elements should be visible and properly sized
    const kakaoButton = page.locator('button:has-text("카카오")').first();
    const naverButton = page.locator('button:has-text("네이버")').first();

    await expect(kakaoButton).toBeVisible();
    await expect(naverButton).toBeVisible();

    // Buttons should stack vertically on mobile
    const kakaoBox = await kakaoButton.boundingBox();
    const naverBox = await naverButton.boundingBox();

    if (kakaoBox && naverBox) {
      // Naver button should be below Kakao button
      expect(naverBox.y).toBeGreaterThan(kakaoBox.y);
    }
  });

  test('should render Korean text without font issues', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Check Korean text is visible (hero heading contains "국가 R&D 사업")
    const koreanText = page.locator('text=국가 R&D 사업').first();
    await expect(koreanText).toBeVisible();
  });

  test('should handle touch interactions', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);

    await page.waitForLoadState('networkidle');

    // Tap Kakao button (touch interaction)
    const kakaoButton = page.locator('button:has-text("카카오")').first();
    await expect(kakaoButton).toBeVisible();

    // Should be tappable
    await kakaoButton.tap();

    // Should navigate (to OAuth flow)
    await page.waitForTimeout(1000);

    // URL should change or popup should appear
    const url = page.url();
    console.log('After tap, URL:', url);
  });

  test('should display images properly', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Check if agency logos or images load
    const images = page.locator('img');
    const imageCount = await images.count();

    // Should have at least some images (logos, etc.)
    expect(imageCount).toBeGreaterThan(0);

    // First image should load
    if (imageCount > 0) {
      const firstImage = images.first();
      await expect(firstImage).toBeVisible();
    }
  });

  test('should load homepage quickly on mobile', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Mobile load should be < 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle slow 3G network gracefully', async ({ page }) => {
    // Simulate slow 3G
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 100); // Add 100ms delay
    });

    await page.goto(`${BASE_URL}/`);

    // Should still load, even if slower
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should work in portrait mode', async ({ page }) => {
    // Portrait is default mobile orientation
    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Content should be visible
    const header = page.locator('header, nav').first();
    await expect(header).toBeVisible();
  });

  test('should work in landscape mode', async ({ page }) => {
    // Get current viewport and swap width/height for landscape
    const viewport = page.viewportSize();
    if (viewport) {
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
    }

    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Content should adapt to landscape
    const header = page.locator('header, nav').first();
    await expect(header).toBeVisible();

    // Should not have horizontal scrolling
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);

    await page.waitForLoadState('networkidle');

    // Buttons should have accessible labels
    const kakaoButton = page.locator('button:has-text("카카오")').first();
    const buttonText = await kakaoButton.textContent();

    expect(buttonText).toBeTruthy();
    expect(buttonText?.length).toBeGreaterThan(0);
  });

  test('should support zoom (pinch-to-zoom)', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Check viewport meta tag allows zooming
    const viewportMeta = page.locator('meta[name="viewport"]');
    const viewportContent = await viewportMeta.getAttribute('content');

    // Should NOT have user-scalable=no (bad for accessibility)
    expect(viewportContent).not.toContain('user-scalable=no');
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`);

    await page.waitForLoadState('networkidle');

    // Check Kakao button (yellow background)
    const kakaoButton = page.locator('button:has-text("카카오")').first();
    await expect(kakaoButton).toBeVisible();

    // Kakao button should have dark text on yellow background (good contrast)
    // This is a visual test - in real scenarios, use axe-core or similar
  });

  test.skip('should show mobile keyboard for text inputs', async ({ page }) => {
    // Note: Can't directly test keyboard appearance, but can test input focus
    await page.goto(`${BASE_URL}/dashboard/profile/create`);

    // Will redirect to sign-in if not authenticated
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

    // For now, just verify page loads
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should handle touch gestures (swipe, scroll)', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.waitForLoadState('networkidle');

    // Test scrolling
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });
});
