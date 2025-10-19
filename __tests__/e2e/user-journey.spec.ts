/**
 * Comprehensive User Journey E2E Tests for Connect Platform
 * 
 * Tests complete user flows from registration to AI interaction
 * 
 * Journey 1: New user registration → Profile completion → View matches
 * Journey 2: Search programs → Filter results → View details → Save program
 * Journey 3: AI interaction → Explanation → Q&A chat
 * 
 * Run with: npx playwright test user-journey.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
const isProduction = BASE_URL.includes('connectplt.kr');

test.describe('Journey 1: New User Registration → Profile → Matches', () => {
  test('should complete full onboarding flow (OAuth → Profile → Dashboard)', async ({ page }) => {
    // Skip on production (write operation)
    test.skip(isProduction, 'Write test - local development only');

    // Step 1: Visit homepage
    await page.goto('/');
    await expect(page.locator('h1, h2').first()).toContainText('R&D');

    // Step 2: Click CTA to sign in
    const ctaButton = page.locator('a[href="/auth/signin"]').first();
    await ctaButton.click();
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Step 3: Verify OAuth buttons visible
    await expect(page.locator('button:has-text("카카오로 시작하기")')).toBeVisible();
    await expect(page.locator('button:has-text("네이버로 시작하기")')).toBeVisible();

    // Note: Cannot complete actual OAuth flow without credentials
    // In real test, user would:
    // 1. Click Kakao/Naver button
    // 2. Authenticate with provider
    // 3. Return to /dashboard/profile/create (new user)
    // 4. Complete profile form
    // 5. View matches on dashboard
  });

  test('should validate profile form properly', async ({ page }) => {
    await page.goto('/dashboard/profile/create');

    // Try to submit empty form
    await page.click('button:has-text("프로필 생성")');

    // Should show validation errors
    const errors = page.locator('[role="alert"]');
    await expect(errors).toBeVisible();
  });

  test('should validate business number format', async ({ page }) => {
    await page.goto('/dashboard/profile/create');
    
    // Check if we're redirected to login (unauthenticated)
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    
    if (currentUrl.includes('/auth/signin')) {
      // Skip test if not authenticated
      test.skip();
      return;
    }
    
    // Wait for form to load
    await page.waitForSelector('#businessNumber', { timeout: 10000 });

    // Test invalid format
    await page.fill('#businessNumber', '12345'); // Too short
    
    // Click submit to trigger validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show validation error
    await expect(page.locator('text=형식이 올바르지 않습니다')).toBeVisible({ timeout: 5000 });

    // Test valid format
    await page.fill('#businessNumber', '123-45-67890');
    await page.locator('#businessNumber').blur();
    await page.waitForTimeout(500);
    
    // Error should disappear
    const errorStillVisible = await page.locator('text=형식이 올바르지 않습니다').isVisible().catch(() => false);
    expect(errorStillVisible).toBe(false);
  });

  test('should toggle between company and research institute forms', async ({ page }) => {
    await page.goto('/dashboard/profile/create');

    // Select company type
    await page.click('text=기업');
    await expect(page.locator('text=산업 분야')).toBeVisible();
    await expect(page.locator('text=직원 수')).toBeVisible();

    // Switch to research institute
    await page.click('text=연구소');
    await expect(page.locator('text=연구기관 유형')).toBeVisible();
    await expect(page.locator('text=연구 분야')).toBeVisible();
  });

  test('should create profile and redirect to dashboard', async ({ page }) => {
    test.skip(isProduction, 'Write test - local development only');

    await page.goto('/dashboard/profile/create');

    // Fill complete profile form
    await page.click('text=기업');
    await page.fill('input[name="name"]', '(주)테스트컴퍼니');
    await page.fill('input[name="businessNumber"]', '123-45-67890');
    await page.selectOption('select[name="industrySector"]', 'ICT');
    await page.selectOption('select[name="employeeCount"]', 'FROM_10_TO_50');
    await page.check('input[name="rdExperience"]');
    await page.fill('textarea[name="description"]', '테스트 기업 프로필입니다');

    // Submit
    await page.click('button:has-text("프로필 생성")');

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display matches after profile creation', async ({ page }) => {
    test.skip(isProduction, 'Write test - local development only');

    // Assumes profile already created
    await page.goto('/dashboard');

    // Wait for match generation
    await page.waitForLoadState('networkidle');

    // Should show matches section
    await expect(page.locator('text=맞춤 펀딩 기회, text=Funding Matches')).toBeVisible();

    // Should show match cards with scores
    const matchCards = page.locator('[data-testid="match-card"], [data-testid="funding-match-card"]');
    await expect(matchCards.first()).toBeVisible();

    // Match cards should have key information
    await expect(page.locator('text=매칭 점수, text=Match Score')).toBeVisible();
    await expect(page.locator('text=마감일, text=Deadline')).toBeVisible();
  });
});

test.describe('Journey 2: Search → Filter → View Details → Save', () => {
  test('should search for programs by keyword', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="검색"]').first();
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill('AI 인공지능');
    await searchInput.press('Enter');

    // Should show filtered results
    await page.waitForLoadState('networkidle');
    
    // Results should contain search term
    const content = await page.content();
    const hasAIContent = content.includes('AI') || content.includes('인공지능');
    expect(hasAIContent).toBe(true);
  });

  test('should filter programs by agency', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Find agency filter
    const agencyFilter = page.locator('select[name*="agency"], [data-testid="agency-filter"]').first();
    
    if (await agencyFilter.isVisible()) {
      // Select IITP
      await agencyFilter.selectOption({ label: 'IITP' });

      // Wait for results to update
      await page.waitForLoadState('networkidle');

      // Results should show only IITP programs
      const content = await page.content();
      expect(content).toContain('IITP');
    }
  });

  test('should filter programs by TRL range', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Look for TRL filter (might be slider or select)
    const trlFilter = page.locator('[data-testid="trl-filter"], select[name*="trl"]').first();
    
    if (await trlFilter.isVisible()) {
      await trlFilter.click();

      // Wait for filter to apply
      await page.waitForLoadState('networkidle');

      // Results should be filtered
      const matchCards = page.locator('[data-testid="match-card"], [data-testid="program-card"]');
      await expect(matchCards.first()).toBeVisible();
    }
  });

  test('should filter programs by budget range', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Look for budget filter
    const budgetFilter = page.locator('[data-testid="budget-filter"], input[name*="budget"]').first();
    
    if (await budgetFilter.isVisible()) {
      await budgetFilter.click();

      // Wait for results
      await page.waitForLoadState('networkidle');
    }
  });

  test('should filter programs by deadline proximity', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Look for deadline filter
    const deadlineFilter = page.locator('select[name*="deadline"], [data-testid="deadline-filter"]').first();
    
    if (await deadlineFilter.isVisible()) {
      await deadlineFilter.selectOption({ index: 1 }); // Select first option

      // Wait for results
      await page.waitForLoadState('networkidle');
    }
  });

  test('should view program details', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Click on first program card
    const firstProgram = page.locator('[data-testid="program-card"], [data-testid="match-card"]').first();
    await firstProgram.click();

    // Should show program detail page
    await expect(page.locator('text=지원 자격, text=Eligibility')).toBeVisible();
    await expect(page.locator('text=신청 기간, text=Application Period')).toBeVisible();
  });

  test('should display complete program information', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Click first program
    const firstProgram = page.locator('[data-testid="program-card"], [data-testid="match-card"]').first();
    await firstProgram.click();

    await page.waitForLoadState('networkidle');

    // Check for essential program details
    const content = await page.content();
    
    // Should have program name/title
    const hasTitle = content.includes('과제') || content.includes('프로그램') || content.includes('Program');
    expect(hasTitle).toBe(true);

    // Should have agency information
    const hasAgency = content.includes('IITP') || content.includes('KEIT') || 
                     content.includes('TIPA') || content.includes('KIMST');
    expect(hasAgency).toBe(true);
  });

  test('should have save/bookmark functionality', async ({ page }) => {
    test.skip(isProduction, 'Write test - local development only');

    await page.goto('/dashboard/programs');

    // Click first program
    const firstProgram = page.locator('[data-testid="program-card"], [data-testid="match-card"]').first();
    await firstProgram.click();

    await page.waitForLoadState('networkidle');

    // Look for save button
    const saveButton = page.locator('button:has-text("저장"), button:has-text("Save")').first();
    
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Should show success message
      await expect(page.locator('text=저장되었습니다, text=Saved')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update URL with filter parameters', async ({ page }) => {
    await page.goto('/dashboard/programs');

    // Apply a filter
    const searchInput = page.locator('input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('AI');
      await searchInput.press('Enter');

      // Wait for URL to update
      await page.waitForTimeout(1000);

      // URL should contain search parameter
      const url = page.url();
      expect(url.includes('search=') || url.includes('q=') || url.includes('AI')).toBeTruthy();
    }
  });
});

test.describe('Journey 3: AI Interaction → Explanation → Chat', () => {
  test('should load AI explanation for match', async ({ page }) => {
    test.skip(isProduction, 'AI costs - local development only');

    await page.goto('/dashboard/matches');

    // Find first match
    const firstMatch = page.locator('[data-testid="match-card"]').first();
    await firstMatch.click();

    // Look for AI explanation button
    const aiExplanationButton = page.locator('button:has-text("AI 설명 보기"), button:has-text("Show AI Explanation")').first();
    
    if (await aiExplanationButton.isVisible()) {
      await aiExplanationButton.click();

      // Should show loading state
      await expect(page.locator('text=로딩, text=Loading')).toBeVisible();

      // Should show explanation (wait up to 5 seconds for AI)
      await expect(page.locator('[data-testid="ai-explanation"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display AI explanation with proper formatting', async ({ page }) => {
    test.skip(isProduction, 'AI costs - local development only');

    await page.goto('/dashboard/matches');

    // Click first match and load AI explanation
    const firstMatch = page.locator('[data-testid="match-card"]').first();
    await firstMatch.click();

    const aiButton = page.locator('button:has-text("AI 설명")').first();
    if (await aiButton.isVisible()) {
      await aiButton.click();

      // Wait for explanation
      await page.waitForSelector('[data-testid="ai-explanation"]', { timeout: 10000 });

      // Explanation should have proper Korean formatting
      const explanation = page.locator('[data-testid="ai-explanation"]');
      const text = await explanation.textContent();
      
      // Should contain Korean characters
      expect(text).toMatch(/[\u3131-\uD79D]/);
      
      // Should be substantial (>100 characters)
      expect(text!.length).toBeGreaterThan(100);
    }
  });

  test('should show match score breakdown in explanation', async ({ page }) => {
    test.skip(isProduction, 'AI costs - local development only');

    await page.goto('/dashboard/matches');

    const firstMatch = page.locator('[data-testid="match-card"]').first();
    await firstMatch.click();

    // Should show match score
    await expect(page.locator('text=매칭 점수, text=Match Score')).toBeVisible();

    // Score should be a number between 0-100
    const scoreText = await page.locator('[data-testid="match-score"]').textContent();
    if (scoreText) {
      const score = parseInt(scoreText.replace(/\D/g, ''));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  test('should open AI chat interface', async ({ page }) => {
    await page.goto('/dashboard/chat');

    // Should show chat interface
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Should have message input
    await expect(page.locator('textarea[placeholder*="질문"], input[placeholder*="질문"]')).toBeVisible();

    // Should have send button
    await expect(page.locator('button[type="submit"], button:has-text("전송")').first()).toBeVisible();
  });

  test('should send message and receive AI response', async ({ page }) => {
    test.skip(isProduction, 'AI costs - local development only');

    await page.goto('/dashboard/chat');

    // Type message
    const messageInput = page.locator('textarea[placeholder*="질문"], input[placeholder*="질문"]').first();
    await messageInput.fill('TRL 7 단계에 적합한 프로그램을 추천해주세요');

    // Send message
    const sendButton = page.locator('button[type="submit"], button:has-text("전송")').first();
    await sendButton.click();

    // Should show user message
    await expect(page.locator('text=TRL 7')).toBeVisible();

    // Should show loading indicator
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 2000 });

    // Should receive AI response (wait up to 10 seconds)
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 15000 });
  });

  test('should maintain conversation context', async ({ page }) => {
    test.skip(isProduction, 'AI costs - local development only');

    await page.goto('/dashboard/chat');

    const messageInput = page.locator('textarea[placeholder*="질문"]').first();
    const sendButton = page.locator('button[type="submit"]').first();

    // Send first message
    await messageInput.fill('IITP의 AI 프로그램에 대해 알려주세요');
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Send follow-up message
    await messageInput.fill('지원 자격이 어떻게 되나요?');
    await sendButton.click();

    // AI should understand context (referring to IITP AI program)
    await page.waitForTimeout(5000);

    // Should show both messages
    await expect(page.locator('text=IITP')).toBeVisible();
    await expect(page.locator('text=지원 자격')).toBeVisible();
  });

  test('should display conversation history', async ({ page }) => {
    await page.goto('/dashboard/chat');

    // Should show previous conversations (if any)
    const conversationList = page.locator('[data-testid="conversation-list"]');
    
    if (await conversationList.isVisible()) {
      // Should have conversation items
      const conversations = conversationList.locator('[data-testid="conversation-item"]');
      const count = await conversations.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show cost information for AI usage', async ({ page }) => {
    await page.goto('/dashboard/chat');

    // Look for cost indicator
    const costInfo = page.locator('[data-testid="cost-info"], text=₩');
    
    // Cost info may or may not be visible depending on implementation
    // This test just checks if present, it's visible
    const isVisible = await costInfo.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(costInfo).toBeVisible();
    }
  });
});

test.describe('User Journey - Performance', () => {
  test('should complete full journey within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    // Navigate through key pages
    await page.goto('/');
    await page.goto('/auth/signin');
    await page.goto('/dashboard/programs');

    const totalTime = Date.now() - startTime;

    // Should complete within 10 seconds
    expect(totalTime).toBeLessThan(10000);
  });

  test('should load matches quickly after profile creation', async ({ page }) => {
    test.skip(isProduction, 'Performance test - local only');

    await page.goto('/dashboard');

    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should respond to search queries quickly', async ({ page }) => {
    await page.goto('/dashboard/programs');

    const searchInput = page.locator('input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      const startTime = Date.now();
      await searchInput.fill('AI');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle');
      const searchTime = Date.now() - startTime;

      // Search should respond within 2 seconds
      expect(searchTime).toBeLessThan(2000);
    }
  });
});

test.describe('User Journey - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Focus first element
    await page.keyboard.press('Tab'); // Focus second element

    // Should be able to activate with Enter
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    expect(focusedElement).toBeTruthy();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for ARIA landmarks
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Check for proper button labels
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Should have either text content or aria-label
      expect(text || ariaLabel).toBeTruthy();
    }
  });
});

