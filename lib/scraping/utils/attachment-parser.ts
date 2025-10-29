/**
 * Attachment Text Extraction Utility
 *
 * Extracts text from Korean government R&D announcement attachments:
 * - PDF: Direct text extraction using pdf-parse
 * - HWPX: ZIP-based XML format (similar to DOCX)
 * - HWP: Binary format → LibreOffice conversion → PDF → text extraction
 *
 * Strategy (per user guidance):
 * 1. Prefer alternate formats (PDF > HWPX > DOCX > HWP)
 * 2. HWP: Convert server-side using LibreOffice headless
 * 3. Fallback: OCR (future enhancement)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import pdfParse from 'pdf-parse';

/**
 * Extract text from attachment based on file type
 *
 * @param fileName - Attachment file name (e.g., "application_guide.pdf")
 * @param fileBuffer - File contents as Buffer
 * @returns Extracted text (up to 5000 characters for performance)
 */
export async function extractTextFromAttachment(
  fileName: string,
  fileBuffer: Buffer
): Promise<string | null> {
  try {
    const ext = path.extname(fileName).toLowerCase();

    console.log(`[ATTACHMENT-PARSER] Processing ${fileName} (${fileBuffer.length} bytes, ${ext})`);

    switch (ext) {
      case '.pdf':
        return await extractTextFromPDF(fileBuffer);

      case '.hwpx':
        return await extractTextFromHWPX(fileBuffer);

      case '.hwp':
        return await extractTextFromHWP(fileBuffer, fileName);

      case '.doc':
      case '.docx':
        console.warn(`[ATTACHMENT-PARSER] DOC/DOCX parsing not yet implemented for ${fileName}`);
        return null;

      case '.zip':
        console.warn(`[ATTACHMENT-PARSER] ZIP archives skipped (may contain multiple files): ${fileName}`);
        return null;

      default:
        console.warn(`[ATTACHMENT-PARSER] Unsupported file type: ${ext} (${fileName})`);
        return null;
    }
  } catch (error: any) {
    console.error(`[ATTACHMENT-PARSER] Failed to extract text from ${fileName}:`, error.message);
    return null;
  }
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractTextFromPDF(fileBuffer: Buffer): Promise<string | null> {
  try {
    const data = await pdfParse(fileBuffer);
    const text = data.text.trim();

    if (text.length === 0) {
      console.warn('[ATTACHMENT-PARSER] PDF contains no text (might be scanned images)');
      return null;
    }

    console.log(`[ATTACHMENT-PARSER] Extracted ${text.length} characters from PDF`);

    // Return first 5000 characters for performance (keyword extraction doesn't need full text)
    return text.substring(0, 5000);
  } catch (error: any) {
    console.error('[ATTACHMENT-PARSER] PDF parsing failed:', error.message);
    return null;
  }
}

/**
 * Extract text from HWPX (ZIP-based XML format, similar to DOCX)
 *
 * HWPX Structure (per Hancom official repo):
 * - ZIP archive containing XML files
 * - Contents/section*.xml: Main document content
 * - Each paragraph is in <hp:p> tags with <hp:t> text nodes
 */
async function extractTextFromHWPX(fileBuffer: Buffer): Promise<string | null> {
  try {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    let extractedText = '';

    // Find and parse all section XML files (section0.xml, section1.xml, etc.)
    for (const entry of zipEntries) {
      if (entry.entryName.match(/Contents\/section\d+\.xml$/i)) {
        const xmlContent = entry.getData().toString('utf8');
        const parsed = xmlParser.parse(xmlContent);

        // Extract text from parsed XML structure
        const sectionText = extractTextFromHWPXSection(parsed);
        if (sectionText) {
          extractedText += sectionText + '\n';
        }
      }
    }

    if (extractedText.trim().length === 0) {
      console.warn('[ATTACHMENT-PARSER] HWPX contains no text');
      return null;
    }

    console.log(`[ATTACHMENT-PARSER] Extracted ${extractedText.length} characters from HWPX`);

    // Return first 5000 characters
    return extractedText.substring(0, 5000).trim();
  } catch (error: any) {
    console.error('[ATTACHMENT-PARSER] HWPX parsing failed:', error.message);
    return null;
  }
}

/**
 * Extract text from HWPX section XML
 * Recursively traverses XML tree to find all text nodes
 */
function extractTextFromHWPXSection(obj: any): string {
  let text = '';

  if (!obj) return text;

  // If object is a string, return it
  if (typeof obj === 'string') {
    return obj;
  }

  // If object is an array, process each element
  if (Array.isArray(obj)) {
    for (const item of obj) {
      text += extractTextFromHWPXSection(item) + ' ';
    }
    return text;
  }

  // If object has text content (common property name: #text, text, t, hp:t)
  if (obj['#text']) {
    text += obj['#text'] + ' ';
  }

  // Recursively process all properties
  for (const key of Object.keys(obj)) {
    if (key !== '#text' && typeof obj[key] === 'object') {
      text += extractTextFromHWPXSection(obj[key]) + ' ';
    }
  }

  return text;
}

/**
 * Extract text from HWP (binary format) using LibreOffice conversion
 *
 * Strategy (per user guidance):
 * 1. Check if LibreOffice is installed (soffice command)
 * 2. Save HWP file to temp directory
 * 3. Convert HWP → PDF using: soffice --headless --convert-to pdf
 * 4. Extract text from converted PDF
 * 5. Clean up temp files
 *
 * @param fileBuffer - HWP file contents
 * @param fileName - Original file name (for logging)
 */
async function extractTextFromHWP(
  fileBuffer: Buffer,
  fileName: string
): Promise<string | null> {
  let tempDir: string | null = null;
  let hwpPath: string | null = null;
  let pdfPath: string | null = null;

  try {
    // 1. Check if LibreOffice is installed
    const hasLibreOffice = checkLibreOfficeInstalled();

    if (!hasLibreOffice) {
      console.warn(
        '[ATTACHMENT-PARSER] LibreOffice not installed - HWP conversion skipped. ' +
        'Install with: brew install libreoffice (macOS) or apt-get install libreoffice (Linux)'
      );
      return null;
    }

    // 2. Create temp directory for conversion
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwp-convert-'));
    hwpPath = path.join(tempDir, fileName);
    const pdfFileName = fileName.replace(/\.hwp$/i, '.pdf');
    pdfPath = path.join(tempDir, pdfFileName);

    // 3. Write HWP file to temp directory
    fs.writeFileSync(hwpPath, fileBuffer);

    console.log(`[ATTACHMENT-PARSER] Converting HWP → PDF: ${fileName}`);

    // 4. Convert HWP → PDF using LibreOffice headless mode
    // --headless: Run without GUI
    // --convert-to pdf: Convert to PDF format
    // --outdir: Output directory for converted file
    const convertCmd = `soffice --headless --convert-to pdf --outdir "${tempDir}" "${hwpPath}"`;

    try {
      execSync(convertCmd, {
        timeout: 30000, // 30 second timeout
        stdio: 'pipe', // Suppress output
      });
    } catch (execError: any) {
      console.error('[ATTACHMENT-PARSER] LibreOffice conversion failed:', execError.message);
      return null;
    }

    // 5. Check if PDF was created
    if (!fs.existsSync(pdfPath)) {
      console.error('[ATTACHMENT-PARSER] PDF conversion failed - output file not found');
      return null;
    }

    // 6. Read converted PDF and extract text
    const pdfBuffer = fs.readFileSync(pdfPath);
    const extractedText = await extractTextFromPDF(pdfBuffer);

    if (extractedText) {
      console.log(
        `[ATTACHMENT-PARSER] Successfully converted HWP → PDF → text: ${extractedText.length} characters`
      );
    }

    return extractedText;
  } catch (error: any) {
    console.error(`[ATTACHMENT-PARSER] HWP conversion failed for ${fileName}:`, error.message);
    return null;
  } finally {
    // 7. Clean up temp files
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        if (hwpPath && fs.existsSync(hwpPath)) fs.unlinkSync(hwpPath);
        if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        // Silent fail on cleanup - not critical
      }
    }
  }
}

/**
 * Check if LibreOffice is installed (required for HWP conversion)
 */
function checkLibreOfficeInstalled(): boolean {
  try {
    execSync('which soffice', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract keywords from attachment text
 * Uses same keyword extraction logic as main parser
 *
 * @param attachmentText - Extracted text from attachment
 * @returns Array of Korean technology keywords
 */
export function extractKeywordsFromAttachmentText(attachmentText: string): string[] {
  const keywords: string[] = [];

  // Common technology domain keywords (Korean + English)
  const techPatterns = [
    // ICT & Digital
    /\b(AI|인공지능|머신러닝|딥러닝)\b/gi,
    /\b(IoT|사물인터넷|스마트|지능형)\b/gi,
    /\b(빅데이터|데이터분석|클라우드)\b/gi,
    /\b(소프트웨어|SW|앱|애플리케이션)\b/gi,
    /\b(5G|6G|통신|네트워크)\b/gi,

    // Bio & Healthcare
    /\b(바이오|생명공학|의료|헬스케어)\b/gi,
    /\b(제약|신약|치료제|백신)\b/gi,
    /\b(진단|검사|의료기기)\b/gi,

    // Environment & Energy
    /\b(환경|친환경|그린|탄소중립)\b/gi,
    /\b(에너지|신재생|태양광|풍력|수소)\b/gi,

    // Manufacturing & Materials
    /\b(제조|생산|공정|스마트공장)\b/gi,
    /\b(소재|부품|장비|반도체)\b/gi,

    // Agriculture & Food
    /\b(농업|스마트팜|작물|양식)\b/gi,
    /\b(식품|푸드테크|식품가공)\b/gi,

    // Infrastructure
    /\b(건설|교통|스마트시티|인프라)\b/gi,
    /\b(해양|수산|조선|해운)\b/gi,

    // Project types
    /\b(개발|연구|실증|사업화|상용화)\b/gi,
    /\b(플랫폼|시스템|솔루션)\b/gi,

    // Eligibility keywords
    /\b(중소기업|벤처|스타트업|창업)\b/gi,
    /\b(대학|연구소|출연연|산학연)\b/gi,
    /\b(컨소시엄|공동연구|협력)\b/gi,
  ];

  for (const pattern of techPatterns) {
    const matches = attachmentText.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 1) {
        keywords.push(match[1]);
      }
    }
  }

  // Deduplicate and return top 20 keywords
  return Array.from(new Set(keywords.map((k) => k.trim()))).filter((k) => k.length > 0);
}
