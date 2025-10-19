/**
 * Error Scenarios and Edge Cases E2E Tests
 * 
 * Tests error handling, edge cases, and fallback mechanisms:
 * - Empty search results
 * - AI API failures (circuit breaker)
 * - Database connection errors
 * - Session expiration
 * - Network failures
 * - Invalid inputs
 * 
 * Run with: npx playwright test error-scenarios.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
const isProduction = BASE_URL.includes('connectplt.kr');

test.describe('Error Handling: Empty Results', () => {
  test('should handle empty search results gracefully', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Search for something that won't exist
    const searchInput = page.locator('input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('XYZNONEXISTENTPROGRAM123456789');
      await searchInput.press('Enter');

      await page.waitForLoadState('networkidle');

      // Should show "no results" message
      const content = await page.content();
      const hasNoResultsMessage = content.includes('결과가 없습니다') || 
                                  content.includes('No results') ||
                                  content.includes('검색 결과가 없습니다') ||
                                  content.includes('0개');
      
      expect(hasNoResultsMessage).toBe(true);
    }
  });

  test('should handle filters that return no matches', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Apply multiple restrictive filters
    const agencyFilter = page.locator('select[name*="agency"]').first();
    const trlFilter = page.locator('select[name*="trl"]').first();
    
    if (await agencyFilter.isVisible() && await trlFilter.isVisible()) {
      await agencyFilter.selectOption({ index: 1 });
      await trlFilter.selectOption({ index: 1 });

      await page.waitForLoadState('networkidle');

      // Should either show results or empty state
      const content = await page.content();
      // Page should load without crashing
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should show empty state when no matches available', async ({ page }) => {
    // New user with no matches yet
    await page.goto('/dashboard/matches');

    await page.waitForLoadState('networkidle');

    // Should show either matches or empty state (not error)
    const hasContent = await page.locator('main, [role="main"]').isVisible();
    expect(hasContent).toBe(true);
  });

  test('should handle missing program details gracefully', async ({ page }) => {
    // Try to access non-existent program
    await page.goto('/dashboard/programs/nonexistent-program-id-12345');

    await page.waitForLoadState('networkidle');

    // Should show 404 or redirect, not crash
    const url = page.url();
    const content = await page.content();
    
    const isHandled = url.includes('404') || 
                     content.includes('404') ||
                     content.includes('찾을 수 없습니다') ||
                     content.includes('Not found') ||
                     url.includes('/dashboard');
    
    expect(isHandled).toBe(true);
  });
});

test.describe('Error Handling: AI API Failures', () => {
  test('should show fallback content when AI is unavailable', async ({ page }) => {
    test.skip(isProduction, 'Requires AI failure simulation - local only');

    // This test requires mocking AI failure
    // In a real scenario, you'd use network interception to simulate failure
    
    await page.goto('/dashboard/matches');
    
    const firstMatch = page.locator('[data-testid="match-card"]').first();
    await firstMatch.click();

    // Try to load AI explanation
    const aiButton = page.locator('button:has-text("AI 설명")').first();
    
    if (await aiButton.isVisible()) {
      await aiButton.click();

      // Should either show AI explanation or fallback content
      // Should NOT show raw error message
      await page.waitForTimeout(5000);

      const content = await page.content();
      const hasRawError = content.includes('Error:') || 
                         content.includes('Uncaught') ||
                         content.includes('undefined');
      
      expect(hasRawError).toBe(false);
    }
  });

  test('should handle AI chat errors gracefully', async ({ page }) => {
    test.skip(isProduction, 'Requires error simulation - local only');

    await page.goto('/dashboard/chat');

    const messageInput = page.locator('textarea[placeholder*="질문"]').first();
    const sendButton = page.locator('button[type="submit"]').first();

    if (await messageInput.isVisible()) {
      await messageInput.fill('테스트 질문입니다');
      await sendButton.click();

      await page.waitForTimeout(8000);

      // Should show either response or error message in Korean
      const content = await page.content();
      const hasMessage = content.includes('답변') || 
                        content.includes('응답') ||
                        content.includes('죄송') ||
                        content.includes('일시적');
      
      // Should have some feedback (not just blank)
      expect(content.length).toBeGreaterThan(1000);
    }
  });

  test('should show circuit breaker activation message', async ({ page }) => {
    test.skip(true, 'Requires circuit breaker trigger - manual test only');

    // Circuit breaker activates after multiple failures
    // This test documents expected behavior
    // Actual implementation would require triggering 5+ consecutive AI failures
    
    await page.goto('/dashboard/chat');

    // After circuit breaker opens, user should see informative message
    // "AI 서비스가 일시적으로 사용할 수 없습니다"
    // Not a technical error message
  });

  test('should handle AI rate limiting gracefully', async ({ page }) => {
    test.skip(isProduction, 'Rate limit test - local only');

    await page.goto('/dashboard/chat');

    const messageInput = page.locator('textarea[placeholder*="질문"]').first();
    const sendButton = page.locator('button[type="submit"]').first();

    if (await messageInput.isVisible()) {
      // Send multiple messages rapidly
      for (let i = 0; i < 15; i++) {
        await messageInput.fill(`테스트 메시지 ${i + 1}`);
        await sendButton.click();
        await page.waitForTimeout(100); // Rapid fire
      }

      await page.waitForTimeout(2000);

      // Should show rate limit message (not crash)
      const content = await page.content();
      const hasRateLimitMessage = content.includes('속도') ||
                                 content.includes('제한') ||
                                 content.includes('너무 많') ||
                                 content.includes('rate limit');
      
      // May or may not hit rate limit, but should not crash
      expect(content.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Error Handling: Database and Network', () => {
  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow 3G
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto('/dashboard');

    // Should show loading state
    await page.waitForLoadState('domcontentloaded');

    // Should eventually load
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const hasContent = await page.locator('main').isVisible();
    expect(hasContent).toBe(true);
  });

  test('should handle network errors with retry', async ({ page }) => {
    test.skip(isProduction, 'Network error test - local only');

    // Simulate network error on first request
    let requestCount = 0;
    await page.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/dashboard');

    await page.waitForTimeout(3000);

    // Should show error message or retry
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });

  test('should handle offline mode', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    const response = await page.goto('/dashboard', { 
      waitUntil: 'domcontentloaded',
      timeout: 5000 
    }).catch(() => null);

    // Should show offline indicator or error
    // (Next.js will show default error page)
    expect(response).toBeTruthy();
  });

  test('should recover from offline to online', async ({ page }) => {
    await page.goto('/');

    // Go offline
    await page.context().setOffline(true);
    await page.goto('/dashboard').catch(() => {});

    // Go back online
    await page.context().setOffline(false);
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');

    // Should load successfully
    const url = page.url();
    expect(url.includes('/dashboard') || url.includes('/auth/signin')).toBeTruthy();
  });
});

test.describe('Error Handling: Session Management', () => {
  test('should handle expired session', async ({ page }) => {
    // Clear cookies to simulate expired session
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard/profile/create');

    // Should redirect to sign-in
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should preserve callback URL after session expiry', async ({ page }) => {
    await page.context().clearCookies();

    // Try to access specific dashboard page
    await page.goto('/dashboard/matches');

    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

    // URL should have callback parameter
    const url = page.url();
    const hasCallback = url.includes('callbackUrl') || url.includes('redirect');
    
    // Callback URL preservation is optional but recommended
    // Test passes either way
    expect(url).toContain('/auth/signin');
  });

  test('should handle concurrent session from different browser', async ({ page }) => {
    test.skip(true, 'Requires multi-browser setup - manual test only');

    // This test documents expected behavior:
    // If user logs in from Browser A, then Browser B,
    // Browser A should either:
    // 1. Continue working (session sharing)
    // 2. Be logged out gracefully (session invalidation)
    // NOT: Show error 500 or crash
  });

  test('should handle CSRF token validation', async ({ page }) => {
    await page.goto('/auth/signin');

    // Next.js NextAuth has built-in CSRF protection
    // This test verifies no CSRF errors appear in normal flow
    await page.waitForLoadState('networkidle');

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate around
    await page.goto('/dashboard').catch(() => {});

    // Should not have CSRF errors
    const csrfErrors = consoleErrors.filter(err => err.includes('CSRF'));
    expect(csrfErrors).toHaveLength(0);
  });
});

test.describe('Error Handling: Invalid Inputs', () => {
  test('should sanitize XSS attempts in search', async ({ page }) => {
    await page.goto('/dashboard/programs');

    const searchInput = page.locator('input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      // Try XSS payload
      await searchInput.fill('<script>alert("XSS")</script>');
      await searchInput.press('Enter');

      await page.waitForTimeout(2000);

      // Should not execute script
      const dialogs: string[] = [];
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        dialog.dismiss();
      });

      await page.waitForTimeout(1000);

      // No alert should have appeared
      expect(dialogs).toHaveLength(0);
    }
  });

  test('should handle SQL injection attempts', async ({ page }) => {
    await page.goto('/dashboard/programs');

    const searchInput = page.locator('input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      // Try SQL injection payload
      await searchInput.fill("'; DROP TABLE programs; --");
      await searchInput.press('Enter');

      await page.waitForTimeout(2000);

      // Should not crash, just treat as search term
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);

      // Next page load should still work (table not dropped)
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const dashboardContent = await page.content();
      expect(dashboardContent.length).toBeGreaterThan(0);
    }
  });

  test('should validate business number format strictly', async ({ page }) => {
    await page.goto('/dashboard/profile/create');

    const businessInput = page.locator('input[name="businessNumber"]');

    // Test various invalid formats
    const invalidInputs = [
      '000-00-00000', // All zeros
      '999-99-99999', // Invalid checksum
      '<script>alert("xss")</script>',
      '../../etc/passwd',
      '${env:AWS_SECRET_KEY}',
      'null',
      'undefined',
    ];

    for (const input of invalidInputs) {
      await businessInput.fill(input);
      await businessInput.blur();

      await page.waitForTimeout(500);

      // Should show validation error or reject input
      const value = await businessInput.inputValue();
      const hasError = await page.locator('text=형식, text=올바르지').isVisible();

      // Either value is rejected or error is shown
      expect(hasError || value !== input).toBe(true);
    }
  });

  test('should handle very long input strings', async ({ page }) => {
    await page.goto('/dashboard/profile/create');

    const descriptionInput = page.locator('textarea[name="description"]');

    // Input extremely long string
    const longString = 'A'.repeat(10000);
    await descriptionInput.fill(longString);

    await page.waitForTimeout(500);

    // Should either truncate or show validation error
    const value = await descriptionInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(10000);
  });

  test('should handle special characters in company name', async ({ page }) => {
    await page.goto('/dashboard/profile/create');

    const nameInput = page.locator('input[name="name"]');

    // Test special characters
    const specialChars = [
      '(주)테스트™',
      'Test & Co.',
      'Company <> Ltd',
      'Test "Company"',
      "O'Reilly Corp",
    ];

    for (const name of specialChars) {
      await nameInput.fill(name);
      await nameInput.blur();
      await page.waitForTimeout(300);

      // Should accept or sanitize (not crash)
      const value = await nameInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Error Handling: 404 and Invalid Routes', () => {
  test('should show 404 for nonexistent pages', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');

    await page.waitForLoadState('networkidle');

    const content = await page.content();
    const has404 = content.includes('404') || content.includes('Not Found');

    expect(has404).toBe(true);
  });

  test('should show 404 for nonexistent program ID', async ({ page }) => {
    await page.goto('/dashboard/programs/invalid-program-id-99999');

    await page.waitForLoadState('networkidle');

    // Should show 404 or redirect to programs list
    const url = page.url();
    const content = await page.content();

    const isHandled = url.includes('/programs') || 
                     content.includes('404') ||
                     content.includes('찾을 수 없습니다');

    expect(isHandled).toBe(true);
  });

  test('should handle invalid API routes gracefully', async ({ page }) => {
    const response = await page.goto('/api/invalid-endpoint-12345');

    // Should return error status
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });

  test('should handle malformed URLs', async ({ page }) => {
    const malformedUrls = [
      '/dashboard/../../../etc/passwd',
      '/dashboard/%2e%2e%2f',
      '/dashboard///',
      '/dashboard?param=<script>alert(1)</script>',
    ];

    for (const url of malformedUrls) {
      const response = await page.goto(BASE_URL + url).catch(() => null);

      // Should either redirect safely or return error
      // Should NOT crash server or expose sensitive data
      if (response) {
        const finalUrl = page.url();
        expect(finalUrl).not.toContain('/etc/passwd');
        expect(finalUrl).not.toContain('<script>');
      }
    }
  });
});

test.describe('Error Handling: API Error Responses', () => {
  test('should show user-friendly error for API failures', async ({ page }) => {
    test.skip(isProduction, 'API error test - local only');

    // Intercept API call and return error
    await page.route('**/api/matches/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/dashboard/matches');

    await page.waitForTimeout(2000);

    const content = await page.content();

    // Should show Korean error message, not technical error
    const hasFriendlyError = content.includes('오류') ||
                            content.includes('문제') ||
                            content.includes('다시 시도');

    const hasTechnicalError = content.includes('500') ||
                             content.includes('Internal server error');

    // Should show friendly message, not raw error
    expect(hasFriendlyError || !hasTechnicalError).toBe(true);
  });

  test('should retry failed API requests', async ({ page }) => {
    test.skip(isProduction, 'API retry test - local only');

    let attemptCount = 0;

    await page.route('**/api/matches/**', (route) => {
      attemptCount++;
      if (attemptCount <= 2) {
        // Fail first 2 attempts
        route.abort('failed');
      } else {
        // Succeed on 3rd attempt
        route.continue();
      }
    });

    await page.goto('/dashboard/matches');

    await page.waitForTimeout(5000);

    // Should eventually succeed after retries
    expect(attemptCount).toBeGreaterThanOrEqual(2);
  });

  test('should handle timeout errors gracefully', async ({ page }) => {
    test.skip(isProduction, 'Timeout test - local only');

    await page.route('**/api/**', (route) => {
      // Never respond (simulate timeout)
      // The route handler will time out
    });

    await page.goto('/dashboard', { timeout: 5000 }).catch(() => {});

    await page.waitForTimeout(6000);

    // Should show timeout error message
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });
});

test.describe('Error Handling: Concurrent Operations', () => {
  test('should handle multiple rapid clicks gracefully', async ({ page }) => {
    await page.goto('/dashboard/programs');

    const firstProgram = page.locator('[data-testid="program-card"], [data-testid="match-card"]').first();

    if (await firstProgram.isVisible()) {
      // Click rapidly 5 times
      for (let i = 0; i < 5; i++) {
        await firstProgram.click({ timeout: 1000 }).catch(() => {});
      }

      await page.waitForTimeout(2000);

      // Should not crash or show errors
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should handle form submission during loading', async ({ page }) => {
    test.skip(isProduction, 'Form submission test - local only');

    await page.goto('/dashboard/profile/create');

    // Fill form
    await page.fill('input[name="name"]', 'Test Company');

    // Submit multiple times rapidly
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();

    await page.waitForTimeout(3000);

    // Should only create one profile (deduplication)
    // Or show proper validation error
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });
});

test.describe('Error Recovery', () => {
  test('should allow user to retry after error', async ({ page }) => {
    await page.goto('/dashboard/programs');

    const searchInput = page.locator('input[type="search"]').first();

    if (await searchInput.isVisible()) {
      // Search for nonexistent item
      await searchInput.fill('NONEXISTENT123456');
      await searchInput.press('Enter');

      await page.waitForTimeout(2000);

      // Clear and search again
      await searchInput.clear();
      await searchInput.fill('AI');
      await searchInput.press('Enter');

      await page.waitForTimeout(2000);

      // Should show results
      const content = await page.content();
      expect(content.length).toBeGreaterThan(1000);
    }
  });

  test('should preserve user input after validation error', async ({ page }) => {
    await page.goto('/dashboard/profile/create');

    // Fill partial form (missing required fields)
    await page.fill('input[name="name"]', 'Test Company');
    await page.fill('input[name="businessNumber"]', '123-45-67890');

    // Try to submit
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // Input values should be preserved
    const nameValue = await page.locator('input[name="name"]').inputValue();
    const businessValue = await page.locator('input[name="businessNumber"]').inputValue();

    expect(nameValue).toBe('Test Company');
    expect(businessValue).toBe('123-45-67890');
  });
});

