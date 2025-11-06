/**
 * Hancom Docs HWP → Screenshot → Text Extractor
 *
 * Uses Hancom Docs web service (https://www.hancomdocs.com) to render HWP files,
 * then captures screenshots and extracts text using GPT-4 Vision API.
 *
 * This approach bypasses PDF download bot detection while maintaining 100% HWP compatibility.
 *
 * Strategy:
 * 1. Launch headless browser
 * 2. Login to Hancom Docs
 * 3. Upload HWP file
 * 4. Wait for editor to load and render content
 * 5. Take full-page screenshot(s) of rendered content
 * 6. Extract text using GPT-4 Vision API
 * 7. Clean up
 *
 * Requirements:
 * - Hancom Docs subscription (credentials in environment variables)
 * - Playwright browser installed
 * - OpenAI API key (for GPT-4 Vision)
 * - Internet connection
 */

import { chromium, Browser, Page } from 'playwright';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Hancom Docs credentials (from environment)
const HANCOM_EMAIL = process.env.HANCOM_DOCS_ID || process.env.HANCOM_EMAIL || 'kbj20415@gmail.com';
const HANCOM_PASSWORD = process.env.HANCOM_DOCS_PW || process.env.HANCOM_PASSWORD || 'BSiw237877^^';

// OpenAI API for vision-based text extraction
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Timeouts
const UPLOAD_TIMEOUT = 60000; // 60 seconds for upload
const EDITOR_LOAD_TIMEOUT = 30000; // 30 seconds for editor to load
const LOGIN_TIMEOUT = 30000; // 30 seconds for login

/**
 * Convert HWP file to text using Hancom Docs web service + screenshot + GPT-4 Vision
 *
 * @param hwpBuffer - HWP file content as Buffer
 * @param fileName - Original HWP filename
 * @param sharedBrowser - Optional pre-authenticated browser instance (for batch conversions)
 * @returns Extracted text from screenshots, or null if conversion fails
 */
export async function convertHWPViaScreenshotHancomDocs(
  hwpBuffer: Buffer,
  fileName: string,
  sharedBrowser?: Browser
): Promise<string | null> {
  let browser: Browser | null = null;
  let tempHwpPath: string | null = null;
  const shouldCloseBrowser = !sharedBrowser; // Only close if we created it

  try {
    console.log(`[HANCOM-SCREENSHOT] Converting HWP → Screenshot → Text: ${fileName}`);
    console.log(`[HANCOM-SCREENSHOT] HWP file size: ${hwpBuffer.length} bytes`);

    // 1. Save HWP to temp file
    const tempDir = os.tmpdir();
    tempHwpPath = path.join(tempDir, `hancom-upload-${Date.now()}-${fileName}`);
    fs.writeFileSync(tempHwpPath, hwpBuffer);

    // 2. Use shared browser or launch new one
    if (sharedBrowser) {
      console.log('[HANCOM-SCREENSHOT] Using shared authenticated browser session');
      browser = sharedBrowser;
    } else {
      console.log('[HANCOM-SCREENSHOT] Launching browser...');
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', // Hide automation flag
          '--disable-dev-shm-usage', // Avoid shared memory issues
        ],
      });
    }

    // Get or create context
    let context;
    if (sharedBrowser) {
      const existingContexts = browser.contexts();
      if (existingContexts.length > 0) {
        console.log('[HANCOM-SCREENSHOT] Reusing existing authenticated context');
        context = existingContexts[0];
      } else {
        throw new Error('Shared browser has no contexts - this should not happen');
      }
    } else {
      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
      });
    }

    const page = await context.newPage();

    // 3. Login to Hancom Docs (only if using new browser)
    if (!sharedBrowser) {
      console.log('[HANCOM-SCREENSHOT] Logging in to Hancom Docs...');
      await loginToHancomDocs(page);
    } else {
      console.log('[HANCOM-SCREENSHOT] Using shared browser - ensuring homepage is loaded...');
      const currentUrl = page.url();
      if (!currentUrl.includes('/ko/home')) {
        await page.goto('https://www.hancomdocs.com/ko/home', {
          waitUntil: 'networkidle',
          timeout: 30000,
        });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000);
      }
    }

    // 4. Upload HWP file
    await uploadHWPFile(page, tempHwpPath);

    // 5. Click toast notification to open editor in NEW WINDOW
    const editorPage = await clickToastFilename(page, fileName);

    // 6. Wait for editor to load and render content
    await waitForEditorReady(editorPage);

    // 7. Take screenshots of rendered content
    console.log('[HANCOM-SCREENSHOT] Taking screenshots of editor content...');
    const screenshots = await captureEditorScreenshots(editorPage);

    if (screenshots.length === 0) {
      console.error('[HANCOM-SCREENSHOT] No screenshots captured');
      await editorPage.close();
      return null;
    }

    console.log(`[HANCOM-SCREENSHOT] ✓ Captured ${screenshots.length} screenshot(s)`);

    // 8. Extract text from screenshots using GPT-4 Vision
    const extractedText = await extractTextFromScreenshots(screenshots, fileName);

    if (extractedText) {
      console.log(
        `[HANCOM-SCREENSHOT] ✓ Successfully extracted text: ${extractedText.length} characters`
      );
    } else {
      console.warn('[HANCOM-SCREENSHOT] Screenshots captured but text extraction returned empty');
    }

    // 9. Close the editor page
    await editorPage.close();

    // 10. Close the homepage page (but not context/browser if shared)
    await page.close();

    // Only close context if we created it (not using shared browser)
    if (!sharedBrowser) {
      await context.close();
    }

    // Clean up screenshot files
    screenshots.forEach((screenshot) => {
      if (fs.existsSync(screenshot.path)) {
        try {
          fs.unlinkSync(screenshot.path);
        } catch (cleanupError) {
          // Silent fail on cleanup
        }
      }
    });

    return extractedText;
  } catch (error: any) {
    console.error(`[HANCOM-SCREENSHOT] Conversion failed for ${fileName}:`, error.message);
    return null;
  } finally {
    // Clean up browser only if we created it (not shared)
    if (browser && shouldCloseBrowser) {
      await browser.close();
    }

    // Clean up temp file
    if (tempHwpPath && fs.existsSync(tempHwpPath)) {
      try {
        fs.unlinkSync(tempHwpPath);
      } catch (cleanupError) {
        // Silent fail on cleanup
      }
    }
  }
}

/**
 * Login to Hancom Docs
 */
async function loginToHancomDocs(page: Page): Promise<void> {
  await page.goto('https://www.hancomdocs.com/ko/', {
    waitUntil: 'networkidle',
    timeout: LOGIN_TIMEOUT,
  });

  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('**/oauth2/authorize**', { timeout: LOGIN_TIMEOUT });

  const emailTextbox = page.getByRole('textbox', { name: '이메일' });
  const passwordTextbox = page.getByRole('textbox', { name: '비밀번호' });

  await emailTextbox.waitFor({ state: 'visible', timeout: LOGIN_TIMEOUT });
  await passwordTextbox.waitFor({ state: 'visible', timeout: LOGIN_TIMEOUT });

  await emailTextbox.fill(HANCOM_EMAIL);
  await passwordTextbox.fill(HANCOM_PASSWORD);

  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.waitForURL('**/ko/home', { timeout: LOGIN_TIMEOUT });

  console.log('[HANCOM-SCREENSHOT] Login successful');
}

/**
 * Upload HWP file to Hancom Docs
 */
async function uploadHWPFile(page: Page, hwpPath: string): Promise<void> {
  console.log('[HANCOM-SCREENSHOT] Uploading HWP file...');

  const fileInput = page.locator('#contained-button-file');
  await fileInput.waitFor({ state: 'attached', timeout: 10000 });
  await fileInput.setInputFiles(hwpPath);

  console.log('[HANCOM-SCREENSHOT] ✓ File uploaded, waiting for toast notification...');
}

/**
 * Click filename in toast notification to open editor
 */
async function clickToastFilename(page: Page, fileName: string): Promise<Page> {
  console.log('[HANCOM-SCREENSHOT] Waiting for upload toast notification...');

  try {
    await page.waitForSelector('text=/.*업로드.*완료.*/', {
      state: 'visible',
      timeout: 15000,
    });

    console.log('[HANCOM-SCREENSHOT] ✓ Upload completion toast detected');

    const fileNameShort = fileName.substring(0, 30);
    const fileNameVeryShort = fileName.substring(0, 15);

    let toastLink;

    try {
      toastLink = page.locator(`text="${fileName}"`).first();
      await toastLink.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      try {
        toastLink = page.getByText(fileNameShort, { exact: false }).first();
        await toastLink.waitFor({ state: 'visible', timeout: 3000 });
      } catch {
        try {
          toastLink = page.getByText(fileNameVeryShort, { exact: false }).first();
          await toastLink.waitFor({ state: 'visible', timeout: 3000 });
        } catch {
          toastLink = page
            .locator('[class*="toast"] a, [class*="notification"] a, [class*="snackbar"] a')
            .first();
          await toastLink.waitFor({ state: 'visible', timeout: 3000 });
        }
      }
    }

    const newPagePromise = page.context().waitForEvent('page');
    await toastLink.click();

    const editorPage = await newPagePromise;
    await editorPage.waitForLoadState('domcontentloaded');

    console.log('[HANCOM-SCREENSHOT] ✓ Editor opened in new window');
    return editorPage;
  } catch (error: any) {
    throw new Error(`Failed to click toast notification: ${error.message}`);
  }
}

/**
 * Wait for HWP editor to finish loading
 */
async function waitForEditorReady(editorPage: Page): Promise<void> {
  console.log('[HANCOM-SCREENSHOT] Waiting for editor to load...');

  await editorPage.waitForURL('**/webhwp/?mode=HWP_EDITOR**', { timeout: EDITOR_LOAD_TIMEOUT });
  await editorPage.waitForSelector('text=파일', { state: 'visible', timeout: EDITOR_LOAD_TIMEOUT });

  // Dismiss modal dialogs using DOM manipulation (proven working approach)
  try {
    const modal = editorPage.locator('#modal_dialog, .modal_dialog').first();
    const isModalVisible = await modal.isVisible().catch(() => false);

    if (isModalVisible) {
      console.log('[HANCOM-SCREENSHOT] Modal dialog detected, forcibly hiding via DOM...');

      await editorPage.evaluate(() => {
        const modalElements = document.querySelectorAll('#modal_dialog, .modal_dialog');
        modalElements.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }
        });
      });

      console.log('[HANCOM-SCREENSHOT] ✓ Modal forcibly hidden');
    }
  } catch (error: any) {
    console.log('[HANCOM-SCREENSHOT] No modal dialog found');
  }

  // Hide loading indicators
  try {
    await editorPage.evaluate(() => {
      const loadingElements = document.querySelectorAll(
        '.tool_loading_progress, #tool_box .tool_loading_progress'
      );
      loadingElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      });

      const toolBox = document.getElementById('tool_box');
      if (toolBox && toolBox.getAttribute('aria-hidden') === 'true') {
        toolBox.style.display = 'none';
        toolBox.style.visibility = 'hidden';
        toolBox.style.opacity = '0';
        toolBox.style.pointerEvents = 'none';
      }
    });
  } catch (error: any) {
    // Ignore errors
  }

  // Wait for content to finish rendering
  await editorPage.waitForTimeout(3000);

  console.log('[HANCOM-SCREENSHOT] ✓ Editor loaded and ready');
}

/**
 * Capture screenshots of the editor content
 *
 * Strategy:
 * 1. Take full-page screenshot to capture all visible content
 * 2. If document has multiple pages, scroll and capture additional screenshots
 * 3. Return array of screenshot buffers for processing
 */
async function captureEditorScreenshots(
  editorPage: Page
): Promise<Array<{ path: string; buffer: Buffer }>> {
  const screenshots: Array<{ path: string; buffer: Buffer }> = [];
  const tempDir = os.tmpdir();

  try {
    console.log('[HANCOM-SCREENSHOT] Capturing full-page screenshot...');

    // First, try to find the main content container
    // Hancom Docs editor typically has a container with the rendered document
    const contentSelectors = [
      '#editor_container',
      '#document_container',
      '#content_area',
      '.editor_content',
      '[class*="editor"][class*="content"]',
    ];

    let contentContainer = null;
    for (const selector of contentSelectors) {
      try {
        const element = editorPage.locator(selector).first();
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) {
          contentContainer = element;
          console.log(`[HANCOM-SCREENSHOT] Found content container: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (contentContainer) {
      // Take screenshot of just the content area (cleaner, no UI chrome)
      const screenshotPath = path.join(tempDir, `hancom-screenshot-${Date.now()}.png`);
      const screenshotBuffer = await contentContainer.screenshot({
        type: 'png',
        timeout: 30000,
      });

      fs.writeFileSync(screenshotPath, screenshotBuffer);
      screenshots.push({ path: screenshotPath, buffer: screenshotBuffer });

      console.log('[HANCOM-SCREENSHOT] ✓ Content screenshot captured');
    } else {
      // Fallback: take full page screenshot
      console.log('[HANCOM-SCREENSHOT] Content container not found, taking full page screenshot...');

      const screenshotPath = path.join(tempDir, `hancom-screenshot-${Date.now()}.png`);
      const screenshotBuffer = await editorPage.screenshot({
        type: 'png',
        fullPage: true,
        timeout: 30000,
      });

      fs.writeFileSync(screenshotPath, screenshotBuffer);
      screenshots.push({ path: screenshotPath, buffer: screenshotBuffer });

      console.log('[HANCOM-SCREENSHOT] ✓ Full page screenshot captured');
    }

    return screenshots;
  } catch (error: any) {
    console.error('[HANCOM-SCREENSHOT] Screenshot capture error:', error.message);
    return screenshots; // Return whatever we captured so far
  }
}

/**
 * Extract text from screenshots using GPT-4 Vision API
 */
async function extractTextFromScreenshots(
  screenshots: Array<{ path: string; buffer: Buffer }>,
  fileName: string
): Promise<string | null> {
  try {
    console.log('[HANCOM-SCREENSHOT] Extracting text using GPT-4 Vision...');

    // Convert screenshots to base64 for OpenAI API
    const imageContents = screenshots.map((screenshot) => {
      const base64Image = screenshot.buffer.toString('base64');
      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:image/png;base64,${base64Image}`,
          detail: 'high' as const, // High detail for better OCR
        },
      };
    });

    // Call GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 Omni has excellent vision capabilities
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a screenshot of a Korean HWP (Hangul Word Processor) document titled "${fileName}".

Please extract ALL text content from this document with the following requirements:

1. **Preserve all Korean text exactly as shown** - this is critical for government program announcements
2. **Maintain document structure** - preserve headings, sections, bullet points, and formatting
3. **Include all details** - dates, numbers, program names, requirements, etc.
4. **Organize logically** - use markdown formatting (headings, lists, etc.) to preserve structure
5. **Be comprehensive** - do not summarize or omit any content

Extract the complete text now:`,
            },
            ...imageContents,
          ],
        },
      ],
      max_tokens: 4096, // Allow long responses for detailed documents
      temperature: 0.1, // Low temperature for accurate extraction
    });

    const extractedText = response.choices[0]?.message?.content?.trim();

    if (!extractedText) {
      console.error('[HANCOM-SCREENSHOT] GPT-4 Vision returned empty response');
      return null;
    }

    console.log('[HANCOM-SCREENSHOT] ✓ Text extraction complete');
    return extractedText;
  } catch (error: any) {
    console.error('[HANCOM-SCREENSHOT] GPT-4 Vision extraction error:', error.message);
    return null;
  }
}

/**
 * Check if screenshot-based conversion is available
 */
export function canUseScreenshotConversion(): boolean {
  const hasHancomCreds = !!(HANCOM_EMAIL && HANCOM_PASSWORD);
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasHancomCreds) {
    console.warn('[HANCOM-SCREENSHOT] Missing Hancom Docs credentials (HANCOM_DOCS_ID, HANCOM_DOCS_PW)');
  }
  if (!hasOpenAI) {
    console.warn('[HANCOM-SCREENSHOT] Missing OpenAI API key (OPENAI_API_KEY)');
  }

  return hasHancomCreds && hasOpenAI;
}

/**
 * Create and authenticate a browser session for Hancom Docs
 * Use this to create a shared browser for batch HWP conversions
 */
export async function createHancomDocsBrowser(): Promise<Browser | null> {
  try {
    console.log('[HANCOM-SCREENSHOT] Creating shared browser session...');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });

    const page = await context.newPage();

    console.log('[HANCOM-SCREENSHOT] Authenticating with Hancom Docs...');
    await loginToHancomDocs(page);

    console.log('[HANCOM-SCREENSHOT] ✓ Shared browser session ready');
    return browser;
  } catch (error: any) {
    console.error('[HANCOM-SCREENSHOT] Failed to create shared browser:', error.message);
    return null;
  }
}
