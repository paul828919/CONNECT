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
 * @returns Extracted text from PDF, or null if conversion fails
 */
export async function convertHWPViaPDFHandomDocs(
  hwpBuffer: Buffer,
  fileName: string
): Promise<string | null> {
  let browser: Browser | null = null;
  let tempHwpPath: string | null = null;
  let tempPdfPath: string | null = null;

  try {
    console.log(`[HANCOM-DOCS] Converting HWP → PDF: ${fileName}`);
    console.log(`[HANCOM-DOCS] HWP file size: ${hwpBuffer.length} bytes`);

    // 1. Save HWP to temp file
    const tempDir = os.tmpdir();
    tempHwpPath = path.join(tempDir, `hancom-upload-${Date.now()}-${fileName}`);
    fs.writeFileSync(tempHwpPath, hwpBuffer);

    // 2. Launch browser
    console.log('[HANCOM-DOCS] Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
    });

    const page = await context.newPage();

    // 3. Login to Hancom Docs
    console.log('[HANCOM-DOCS] Logging in to Hancom Docs...');
    await loginToHancomDocs(page);

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

    return extractedText;
  } catch (error: any) {
    console.error(`[HANCOM-DOCS] Conversion failed for ${fileName}:`, error.message);
    return null;
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
    }

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

  // Fill in credentials
  await page.getByRole('textbox', { name: '이메일' }).fill(HANCOM_EMAIL);
  await page.getByRole('textbox', { name: '비밀번호' }).fill(HANCOM_PASSWORD);

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
