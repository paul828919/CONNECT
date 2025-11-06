/**
 * Hancom Docs HWP → PDF Converter
 *
 * Uses Hancom Docs web service (https://www.hancomdocs.com) to convert HWP files to PDF.
 * This provides 100% compatibility with all HWP versions (5.0, 5.1, Neo, etc.) as Hancom
 * is the official creator of the HWP format.
 *
 * Strategy:
 * 1. Launch headless browser
 * 2. Login to Hancom Docs
 * 3. Upload HWP file
 * 4. Wait for editor to load
 * 5. Download as PDF
 * 6. Extract text from PDF
 * 7. Clean up
 *
 * Requirements:
 * - Hancom Docs subscription (credentials in environment variables)
 * - Playwright browser installed
 * - Internet connection
 */

import { chromium, Browser, Page } from 'playwright';
import pdfParse from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Hancom Docs credentials (from environment)
const HANCOM_EMAIL = process.env.HANCOM_EMAIL || 'kbj20415@gmail.com';
const HANCOM_PASSWORD = process.env.HANCOM_PASSWORD || 'BSiw237877^^';

// Timeouts
const UPLOAD_TIMEOUT = 60000; // 60 seconds for upload
const EDITOR_LOAD_TIMEOUT = 30000; // 30 seconds for editor to load
const PDF_CONVERSION_TIMEOUT = 60000; // 60 seconds for PDF conversion
const LOGIN_TIMEOUT = 30000; // 30 seconds for login

/**
 * Convert HWP file to PDF text using Hancom Docs web service
 *
 * @param hwpBuffer - HWP file content as Buffer
 * @param fileName - Original HWP filename
 * @param sharedBrowser - Optional pre-authenticated browser instance (for batch conversions)
 * @returns Extracted text from PDF, or null if conversion fails
 */
export async function convertHWPViaPDFHandomDocs(
  hwpBuffer: Buffer,
  fileName: string,
  sharedBrowser?: Browser
): Promise<string | null> {
  let browser: Browser | null = null;
  let tempHwpPath: string | null = null;
  const shouldCloseBrowser = !sharedBrowser; // Only close if we created it

  try {
    console.log(`[HANCOM-DOCS] Converting HWP → PDF: ${fileName}`);
    console.log(`[HANCOM-DOCS] HWP file size: ${hwpBuffer.length} bytes`);

    // 1. Save HWP to temp file
    const tempDir = os.tmpdir();
    tempHwpPath = path.join(tempDir, `hancom-upload-${Date.now()}-${fileName}`);
    fs.writeFileSync(tempHwpPath, hwpBuffer);

    // 2. Use shared browser or launch new one
    if (sharedBrowser) {
      console.log('[HANCOM-DOCS] Using shared authenticated browser session');
      browser = sharedBrowser;
    } else {
      console.log('[HANCOM-DOCS] Launching browser...');
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
    // CRITICAL: When using shared browser, reuse the existing authenticated context
    // Creating a new context means NO cookies/session from login!
    let context;
    if (sharedBrowser) {
      const existingContexts = browser.contexts();
      if (existingContexts.length > 0) {
        console.log('[HANCOM-DOCS] Reusing existing authenticated context');
        context = existingContexts[0]; // Reuse the context from login
      } else {
        throw new Error('Shared browser has no contexts - this should not happen');
      }
    } else {
      // Create new context only when using new browser
      context = await browser.newContext({
        acceptDownloads: true,
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
      console.log('[HANCOM-DOCS] Logging in to Hancom Docs...');
      await loginToHancomDocs(page);
      // After login, we're already on /ko/home - no need to navigate again
    } else {
      // With shared browser, we need to ensure we're on the homepage
      console.log('[HANCOM-DOCS] Using shared browser - ensuring homepage is loaded...');

      const currentUrl = page.url();
      console.log(`[HANCOM-DOCS] Current URL: ${currentUrl}`);

      // Always navigate to ensure clean state (new pages start at about:blank)
      if (!currentUrl.includes('/ko/home')) {
        console.log('[HANCOM-DOCS] Navigating to homepage...');
        await page.goto('https://www.hancomdocs.com/ko/home', {
          waitUntil: 'networkidle', // Wait for network to be idle
          timeout: 30000,
        });

        // Additional wait for React SPA to hydrate and render upload button
        console.log('[HANCOM-DOCS] Waiting for page to fully render...');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000); // Give React time to render

        console.log('[HANCOM-DOCS] Page loaded, ready for upload');
      } else {
        console.log('[HANCOM-DOCS] Already on homepage');
      }
    }

    // 4. Upload HWP file
    await uploadHWPFile(page, tempHwpPath);

    // 5. Click toast notification to open editor in NEW WINDOW
    const editorPage = await clickToastFilename(page, fileName);

    // 6. Wait for editor to load in the new window
    await waitForEditorReady(editorPage);

    // 7. Download as PDF from the editor window
    console.log('[HANCOM-DOCS] Downloading as PDF...');
    const pdfBuffer = await downloadAsPDF(editorPage);

    if (!pdfBuffer) {
      console.error('[HANCOM-DOCS] PDF download failed');
      await editorPage.close();
      return null;
    }

    console.log(`[HANCOM-DOCS] ✓ PDF downloaded: ${pdfBuffer.length} bytes`);

    // 8. Extract text from PDF
    const extractedText = await extractTextFromPDF(pdfBuffer);

    if (extractedText) {
      console.log(
        `[HANCOM-DOCS] ✓ Successfully converted HWP → PDF → text: ${extractedText.length} characters`
      );
    } else {
      console.warn('[HANCOM-DOCS] PDF created but text extraction returned empty');
    }

    // 9. Close the editor page
    await editorPage.close();

    // 10. Close the homepage page (but not context/browser if shared)
    await page.close();

    // Only close context if we created it (not using shared browser)
    if (!sharedBrowser) {
      await context.close();
    }

    return extractedText;
  } catch (error: any) {
    console.error(`[HANCOM-DOCS] Conversion failed for ${fileName}:`, error.message);
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
  // Navigate to Hancom Docs homepage
  await page.goto('https://www.hancomdocs.com/ko/', {
    waitUntil: 'networkidle',
    timeout: LOGIN_TIMEOUT,
  });

  // Click login button
  await page.getByRole('button', { name: '로그인' }).click();

  // Wait for login page
  await page.waitForURL('**/oauth2/authorize**', { timeout: LOGIN_TIMEOUT });

  // Wait for login form to be fully loaded and interactive
  const emailTextbox = page.getByRole('textbox', { name: '이메일' });
  const passwordTextbox = page.getByRole('textbox', { name: '비밀번호' });

  await emailTextbox.waitFor({ state: 'visible', timeout: LOGIN_TIMEOUT });
  await passwordTextbox.waitFor({ state: 'visible', timeout: LOGIN_TIMEOUT });

  // Fill in credentials
  await emailTextbox.fill(HANCOM_EMAIL);
  await passwordTextbox.fill(HANCOM_PASSWORD);

  // Click login button
  await page.getByRole('button', { name: '로그인', exact: true }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/ko/home', { timeout: LOGIN_TIMEOUT });

  console.log('[HANCOM-DOCS] Login successful');
}

/**
 * Upload HWP file to Hancom Docs
 *
 * Based on manual workflow observation (2025-10-30):
 * 1. Upload file via hidden input: <input id="contained-button-file" type="file" hidden>
 * 2. Toast notification appears: "1개 항목 업로드 완료됨" with filename link
 * 3. Click filename in toast notification to open editor in NEW WINDOW
 */
async function uploadHWPFile(page: Page, hwpPath: string): Promise<void> {
  console.log('[HANCOM-DOCS] Uploading HWP file...');

  // Upload file via hidden input (direct manipulation is most reliable)
  const fileInput = page.locator('#contained-button-file');
  await fileInput.waitFor({ state: 'attached', timeout: 10000 });
  await fileInput.setInputFiles(hwpPath);

  console.log('[HANCOM-DOCS] ✓ File uploaded, waiting for toast notification...');
}

/**
 * Click filename in toast notification to open editor
 *
 * After upload, a toast notification appears in bottom-right corner with:
 * - Header: "1개 항목 업로드 완료됨" (1 item upload completed)
 * - Clickable filename link (may be truncated if too long)
 * - Checkmark icon indicating success
 *
 * Clicking the filename opens editor in a NEW WINDOW/TAB
 */
async function clickToastFilename(page: Page, fileName: string): Promise<Page> {
  console.log('[HANCOM-DOCS] Waiting for upload toast notification...');

  try {
    // First, wait for the upload completion toast to appear
    // The toast has header text "항목 업로드 완료됨" (item upload completed)
    console.log('[HANCOM-DOCS] Looking for upload completion message...');
    await page.waitForSelector('text=/.*업로드.*완료.*/', {
      state: 'visible',
      timeout: 15000
    });

    console.log('[HANCOM-DOCS] ✓ Upload completion toast detected');

    // Now look for the clickable filename link
    // The toast may truncate long filenames, so try multiple strategies
    const fileNameShort = fileName.substring(0, 30);
    const fileNameVeryShort = fileName.substring(0, 15);

    console.log(`[HANCOM-DOCS] Looking for filename link...`);

    // Try to find the filename link using multiple selectors
    let toastLink;

    // Strategy 1: Full filename match
    try {
      toastLink = page.locator(`text="${fileName}"`).first();
      await toastLink.waitFor({ state: 'visible', timeout: 3000 });
      console.log('[HANCOM-DOCS] Found filename (exact match)');
    } catch {
      // Strategy 2: Partial filename match using getByText with substring
      try {
        toastLink = page.getByText(fileNameShort, { exact: false }).first();
        await toastLink.waitFor({ state: 'visible', timeout: 3000 });
        console.log('[HANCOM-DOCS] Found filename (30 char partial match)');
      } catch {
        // Strategy 3: Very short filename match
        try {
          toastLink = page.getByText(fileNameVeryShort, { exact: false }).first();
          await toastLink.waitFor({ state: 'visible', timeout: 3000 });
          console.log('[HANCOM-DOCS] Found filename (15 char partial match)');
        } catch {
          // Strategy 4: Look for any clickable link in the toast notification area
          console.log('[HANCOM-DOCS] Trying generic toast link selector...');
          toastLink = page.locator('[class*="toast"] a, [class*="notification"] a, [class*="snackbar"] a').first();
          await toastLink.waitFor({ state: 'visible', timeout: 3000 });
          console.log('[HANCOM-DOCS] Found filename (generic toast link)');
        }
      }
    }

    console.log('[HANCOM-DOCS] Clicking filename to open editor...');

    // Set up listener for new page BEFORE clicking
    const newPagePromise = page.context().waitForEvent('page');
    await toastLink.click();

    // Wait for new page to open
    const editorPage = await newPagePromise;
    await editorPage.waitForLoadState('domcontentloaded');

    console.log('[HANCOM-DOCS] ✓ Editor opened in new window');
    return editorPage;
  } catch (error: any) {
    throw new Error(`Failed to click toast notification: ${error.message}`);
  }
}

/**
 * Wait for HWP editor to finish loading in the new window
 */
async function waitForEditorReady(editorPage: Page): Promise<void> {
  console.log('[HANCOM-DOCS] Waiting for editor to load...');

  // Wait for editor URL pattern
  await editorPage.waitForURL('**/webhwp/?mode=HWP_EDITOR**', { timeout: EDITOR_LOAD_TIMEOUT });

  // Wait for the file menu to be available (indicates editor is ready)
  await editorPage.waitForSelector('text=파일', { state: 'visible', timeout: EDITOR_LOAD_TIMEOUT });

  // Dismiss any modal dialogs that may be blocking the interface
  try {
    console.log('[HANCOM-DOCS] Checking for modal dialogs to dismiss...');

    // Check if modal dialog exists
    const modal = editorPage.locator('#modal_dialog, .modal_dialog').first();
    const isModalVisible = await modal.isVisible().catch(() => false);

    if (isModalVisible) {
      console.log('[HANCOM-DOCS] Modal dialog detected, attempting to dismiss...');

      // Try multiple strategies to close the modal
      // Strategy 1: Look for close button with common selectors
      const modalCloseSelectors = [
        '#modal_dialog button[class*="close"]',
        '#modal_dialog [aria-label*="close" i]',
        '#modal_dialog button:has-text("닫기")',
        '#modal_dialog button:has-text("확인")',
        '#modal_dialog button:has-text("X")',
        '.modal_dialog button[class*="close"]',
        '[class*="modal"] button[class*="close"]',
      ];

      let modalDismissed = false;
      for (const selector of modalCloseSelectors) {
        try {
          const closeButton = editorPage.locator(selector).first();
          await closeButton.waitFor({ state: 'visible', timeout: 2000 });
          await closeButton.click();
          console.log(`[HANCOM-DOCS] ✓ Dismissed modal using selector: ${selector}`);
          await editorPage.waitForTimeout(1000); // Wait for modal to close
          modalDismissed = true;
          break;
        } catch {
          // Try next selector
          continue;
        }
      }

      // Strategy 2: If no close button found, try pressing Escape
      if (!modalDismissed) {
        console.log('[HANCOM-DOCS] No close button found, trying Escape key...');
        await editorPage.keyboard.press('Escape');
        await editorPage.waitForTimeout(1000);
      }

      // Verify modal is dismissed
      const isStillVisible = await modal.isVisible().catch(() => false);
      if (isStillVisible) {
        console.log('[HANCOM-DOCS] ⚠️ Modal still visible after normal dismissal, forcing hide via DOM...');

        // Force hide the modal by setting display: none directly
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

        console.log('[HANCOM-DOCS] ✓ Modal forcibly hidden via DOM manipulation');
      } else {
        console.log('[HANCOM-DOCS] ✓ Modal successfully dismissed');
      }
    }
  } catch (error: any) {
    console.log('[HANCOM-DOCS] No modal dialog found or already dismissed');
  }

  // Wait for any loading indicators to complete
  try {
    console.log('[HANCOM-DOCS] Waiting for editor tools to finish loading...');

    // Wait for the tool_loading_progress indicator to disappear
    const loadingProgress = editorPage.locator('.tool_loading_progress, #tool_box .tool_loading_progress');

    // Check if loading indicator exists
    const isLoadingVisible = await loadingProgress.isVisible().catch(() => false);

    if (isLoadingVisible) {
      console.log('[HANCOM-DOCS] Loading indicator detected, attempting to wait for it to disappear...');

      // Try to wait for loading to complete naturally
      try {
        await loadingProgress.waitFor({ state: 'hidden', timeout: 5000 });
        console.log('[HANCOM-DOCS] ✓ Loading completed naturally');
      } catch {
        // Loading didn't complete in time, force hide it
        console.log('[HANCOM-DOCS] Loading indicator stuck, forcing hide via DOM...');

        await editorPage.evaluate(() => {
          const loadingElements = document.querySelectorAll('.tool_loading_progress, #tool_box .tool_loading_progress');
          loadingElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
            }
          });

          // Also hide the entire tool_box container if it's blocking
          const toolBox = document.getElementById('tool_box');
          if (toolBox && toolBox.getAttribute('aria-hidden') === 'true') {
            toolBox.style.display = 'none';
            toolBox.style.visibility = 'hidden';
            toolBox.style.opacity = '0';
            toolBox.style.pointerEvents = 'none';
          }
        });

        console.log('[HANCOM-DOCS] ✓ Loading indicator forcibly hidden');
      }
    } else {
      console.log('[HANCOM-DOCS] No loading indicator found, editor ready');
    }

    // Give editor a moment to stabilize after loading
    await editorPage.waitForTimeout(1000);
  } catch (error: any) {
    console.log('[HANCOM-DOCS] Warning: Could not handle loading indicator:', error.message);
  }

  console.log('[HANCOM-DOCS] ✓ Editor loaded and ready');
}

/**
 * Download opened HWP file as PDF
 *
 * Based on manual workflow (screenshot 4):
 * 1. Click "파일" tab at top of editor
 * 2. Dropdown menu appears with various options
 * 3. Click "PDF로 다운로드" option in the dropdown
 */
async function downloadAsPDF(page: Page): Promise<Buffer | null> {
  try {
    console.log('[HANCOM-DOCS] Looking for File (파일) button in upper-left corner...');

    // The "파일" button is in the upper-left corner of the editor
    // Clicking it displays a dropdown menu with various file operations
    // We need to click it and wait for the dropdown to appear

    // Try multiple strategies to find and click the File button
    try {
      // Strategy 1: Look for button with text "파일"
      const fileButton = page.locator('button:has-text("파일")').first();
      await fileButton.waitFor({ state: 'visible', timeout: 5000 });
      await fileButton.click();
      console.log('[HANCOM-DOCS] File button clicked (strategy 1: button selector)');
    } catch {
      try {
        // Strategy 2: Look for any clickable element with text "파일" in upper area
        const fileButton = page.locator('[role="button"]:has-text("파일")').first();
        await fileButton.waitFor({ state: 'visible', timeout: 5000 });
        await fileButton.click();
        console.log('[HANCOM-DOCS] File button clicked (strategy 2: role=button)');
      } catch {
        // Strategy 3: Fallback to generic text selector
        const fileButton = page.getByText('파일', { exact: true }).first();
        await fileButton.waitFor({ state: 'visible', timeout: 5000 });
        await fileButton.click();
        console.log('[HANCOM-DOCS] File button clicked (strategy 3: text selector)');
      }
    }

    console.log('[HANCOM-DOCS] Waiting for dropdown menu to appear...');

    // Wait for the dropdown menu container to appear
    // Common selectors for dropdown menus
    try {
      await page.locator('[role="menu"], [class*="dropdown"], [class*="menu"][class*="open"]').first().waitFor({
        state: 'visible',
        timeout: 5000
      });
      console.log('[HANCOM-DOCS] ✓ Dropdown menu appeared');
    } catch {
      console.log('[HANCOM-DOCS] Warning: Could not detect dropdown container, proceeding anyway...');
    }

    // Wait for the "PDF로 다운로드" button to become visible in the dropdown
    console.log('[HANCOM-DOCS] Looking for "PDF로 다운로드" button in dropdown...');

    // Try to find the button with multiple selectors
    let pdfDownloadOption;
    try {
      pdfDownloadOption = page.locator('button:has-text("PDF로 다운로드")').first();
      await pdfDownloadOption.waitFor({ state: 'visible', timeout: 10000 });
      console.log('[HANCOM-DOCS] Found PDF download button (button selector)');
    } catch {
      // Fallback to generic text selector
      pdfDownloadOption = page.getByText('PDF로 다운로드', { exact: false }).first();
      await pdfDownloadOption.waitFor({ state: 'visible', timeout: 10000 });
      console.log('[HANCOM-DOCS] Found PDF download button (text selector)');
    }

    console.log('[HANCOM-DOCS] PDF download option now visible, setting up download listener...');

    // Set up download promise BEFORE clicking
    const downloadPromise = page.waitForEvent('download', {
      timeout: PDF_CONVERSION_TIMEOUT,
    });

    console.log('[HANCOM-DOCS] Clicking PDF download option...');
    // Click "Download as PDF"
    await pdfDownloadOption.click();

    // Wait for download to complete
    const download = await downloadPromise;

    // Save to buffer
    const pdfPath = await download.path();
    if (!pdfPath) {
      console.error('[HANCOM-DOCS] Download path is null');
      return null;
    }

    const pdfBuffer = fs.readFileSync(pdfPath);

    console.log('[HANCOM-DOCS] PDF download complete');
    return pdfBuffer;
  } catch (error: any) {
    console.error('[HANCOM-DOCS] PDF download error:', error.message);
    return null;
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string | null> {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text.trim() || null;
  } catch (error: any) {
    console.error('[HANCOM-DOCS] PDF text extraction error:', error.message);
    return null;
  }
}

/**
 * Check if Hancom Docs credentials are configured
 */
export function hasHancomDocsCredentials(): boolean {
  return !!(HANCOM_EMAIL && HANCOM_PASSWORD);
}

/**
 * Create and authenticate a browser session for Hancom Docs
 * Use this to create a shared browser for batch HWP conversions
 *
 * @returns Authenticated browser instance, or null if login fails
 */
export async function createHancomDocsBrowser(): Promise<Browser | null> {
  try {
    console.log('[HANCOM-DOCS] Creating shared browser session...');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled', // Hide automation flag
        '--disable-dev-shm-usage', // Avoid shared memory issues
      ],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });

    const page = await context.newPage();

    // Login to establish authenticated session
    console.log('[HANCOM-DOCS] Authenticating with Hancom Docs...');
    await loginToHancomDocs(page);

    // Keep the page alive - it's already on /ko/home after login
    // This page will be reused for the first conversion
    // Don't close it, to preserve the homepage state with upload button visible

    console.log('[HANCOM-DOCS] ✓ Shared browser session ready');
    return browser;
  } catch (error: any) {
    console.error('[HANCOM-DOCS] Failed to create shared browser:', error.message);
    return null;
  }
}
