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

    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });

    const page = await context.newPage();

    // 3. Login to Hancom Docs (only if using new browser)
    if (!sharedBrowser) {
      console.log('[HANCOM-DOCS] Logging in to Hancom Docs...');
      await loginToHancomDocs(page);
    } else {
      // With shared browser, we're already logged in - just navigate to homepage
      console.log('[HANCOM-DOCS] Navigating to Hancom Docs homepage...');
      await page.goto('https://www.hancomdocs.com/ko/home', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
    }

    // 4. Upload HWP file
    console.log('[HANCOM-DOCS] Uploading HWP file...');
    await uploadHWPFile(page, tempHwpPath);

    // 5. Wait for editor to load
    console.log('[HANCOM-DOCS] Waiting for editor to load...');
    await waitForEditorReady(page);

    // 6. Download as PDF
    console.log('[HANCOM-DOCS] Downloading as PDF...');
    const pdfBuffer = await downloadAsPDF(page);

    if (!pdfBuffer) {
      console.error('[HANCOM-DOCS] PDF download failed');
      return null;
    }

    console.log(`[HANCOM-DOCS] PDF downloaded: ${pdfBuffer.length} bytes`);

    // 7. Extract text from PDF
    const extractedText = await extractTextFromPDF(pdfBuffer);

    if (extractedText) {
      console.log(
        `[HANCOM-DOCS] Successfully converted HWP → PDF → text: ${extractedText.length} characters`
      );
    } else {
      console.warn('[HANCOM-DOCS] PDF created but text extraction returned empty');
    }

    // 8. Close the page/context (but not the browser if shared)
    await page.close();
    await context.close();

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
 */
async function uploadHWPFile(page: Page, hwpPath: string): Promise<void> {
  // Click upload button
  await page.getByRole('button', { name: '문서 업로드' }).click();

  // Wait for file chooser and upload file
  const fileChooserPromise = page.waitForEvent('filechooser');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(hwpPath);

  console.log('[HANCOM-DOCS] HWP file uploaded, waiting for editor...');
}

/**
 * Wait for HWP editor to finish loading
 */
async function waitForEditorReady(page: Page): Promise<void> {
  // Wait for editor URL pattern
  await page.waitForURL('**/webhwp/?mode=HWP_EDITOR**', { timeout: EDITOR_LOAD_TIMEOUT });

  // Wait for the file menu to be available (indicates editor is ready)
  await page.waitForSelector('text=파일', { state: 'visible', timeout: EDITOR_LOAD_TIMEOUT });

  console.log('[HANCOM-DOCS] Editor loaded successfully');
}

/**
 * Download opened HWP file as PDF
 */
async function downloadAsPDF(page: Page): Promise<Buffer | null> {
  try {
    // Click File menu
    await page.locator('div').filter({ hasText: /^파일$/ }).click();

    // Wait for menu to open
    await page.waitForSelector('text=PDF로 다운로드', {
      state: 'visible',
      timeout: 5000,
    });

    // Set up download promise BEFORE clicking
    const downloadPromise = page.waitForEvent('download', {
      timeout: PDF_CONVERSION_TIMEOUT,
    });

    // Click "Download as PDF"
    await page.getByRole('menuitem', { name: 'PDF로 다운로드' }).click();

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

    // Close the login page, but keep browser and context alive
    await page.close();

    console.log('[HANCOM-DOCS] ✓ Shared browser session ready');
    return browser;
  } catch (error: any) {
    console.error('[HANCOM-DOCS] Failed to create shared browser:', error.message);
    return null;
  }
}
