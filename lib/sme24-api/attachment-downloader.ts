/**
 * SME Attachment Downloader
 *
 * Downloads HWP/PDF announcement files from SME program URLs.
 * Prioritizes formats: PDF > HWPX > HWP for optimal text extraction.
 *
 * Data pattern (from SME24 API):
 * - announcementFileUrl + announcementFileName: PRIMARY source
 *   Has actual HWP/HWPX files with Korean filenames (e.g., "공고문.hwp")
 * - attachmentUrls[]: SECONDARY source
 *   Often opaque bizinfo.go.kr URLs without filenames
 *   Content-Type header used to determine format
 *
 * Constraints:
 * - 30s timeout per download
 * - 50MB max file size
 * - Supports PDF, HWPX, HWP formats
 */

// ============================================================================
// Types
// ============================================================================

export interface DownloadResult {
  programId: string;
  fileName: string;
  fileBuffer: Buffer;
  source: 'announcementFileUrl' | 'attachmentUrl';
  downloadDuration: number;
}

export interface DownloadError {
  programId: string;
  url: string;
  error: string;
}

interface SMEProgramInput {
  id: string;
  attachmentUrls: string[];
  attachmentNames: string[];
  announcementFileUrl: string | null;
  announcementFileName?: string | null;
}

// ============================================================================
// Configuration
// ============================================================================

const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/** Content-Type to extension mapping for opaque URLs */
const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/x-hwp': '.hwp',
  'application/haansofthwp': '.hwp',
  'application/vnd.hancom.hwp': '.hwp',
  'application/vnd.hancom.hwpx': '.hwpx',
  'application/octet-stream': '', // ambiguous, check magic bytes
};

// ============================================================================
// Main Download Function
// ============================================================================

/**
 * Download announcement attachments from an SME program
 *
 * Priority order (based on actual data patterns):
 * 1. attachmentUrls[] (bizinfo.go.kr — always returns actual files)
 * 2. announcementFileUrl (smes.go.kr — often returns Content-Length: 0)
 *
 * Note: smes.go.kr getFile endpoint frequently returns empty responses
 * without proper session cookies. bizinfo.go.kr works reliably and
 * includes Content-Disposition headers with Korean filenames.
 *
 * @param program SME program with attachment URLs
 * @returns Array of successfully downloaded files + any errors
 */
export async function downloadSMEAttachments(
  program: SMEProgramInput
): Promise<{ results: DownloadResult[]; errors: DownloadError[] }> {
  const results: DownloadResult[] = [];
  const errors: DownloadError[] = [];

  // Priority 1: attachmentUrls (bizinfo.go.kr — reliable)
  for (let i = 0; i < program.attachmentUrls.length; i++) {
    const url = program.attachmentUrls[i];
    const fileName = program.attachmentNames[i] || null;

    try {
      const result = await downloadFileWithDetection(url, fileName, program.id);
      if (result) {
        results.push(result);
        return { results, errors };
      }
    } catch (error: any) {
      errors.push({
        programId: program.id,
        url,
        error: error.message,
      });
    }
  }

  // Priority 2: announcementFileUrl (smes.go.kr — may return empty)
  if (results.length === 0 && program.announcementFileUrl) {
    const fileName = program.announcementFileName || extractFileNameFromUrl(program.announcementFileUrl);
    try {
      const result = await downloadFile(
        program.announcementFileUrl,
        fileName,
        program.id,
        'announcementFileUrl'
      );
      if (result) {
        results.push(result);
      }
    } catch (error: any) {
      errors.push({
        programId: program.id,
        url: program.announcementFileUrl,
        error: error.message,
      });
    }
  }

  return { results, errors };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Download a file with a known filename
 */
async function downloadFile(
  url: string,
  fileName: string,
  programId: string,
  source: DownloadResult['source']
): Promise<DownloadResult | null> {
  const startTime = Date.now();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ConnectBot/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  // Check Content-Length header for size limit
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${contentLength} bytes (max ${MAX_FILE_SIZE_BYTES})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Downloaded file too large: ${fileBuffer.length} bytes`);
  }

  if (fileBuffer.length === 0) {
    throw new Error('Downloaded file is empty');
  }

  const downloadDuration = Date.now() - startTime;

  return {
    programId,
    fileName,
    fileBuffer,
    source,
    downloadDuration,
  };
}

/**
 * Download from an opaque URL and detect file type from Content-Type/magic bytes
 */
async function downloadFileWithDetection(
  url: string,
  knownFileName: string | null,
  programId: string
): Promise<DownloadResult | null> {
  const startTime = Date.now();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ConnectBot/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  if (fileBuffer.length === 0) {
    throw new Error('Downloaded file is empty');
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Downloaded file too large: ${fileBuffer.length} bytes`);
  }

  // Determine filename
  let fileName = knownFileName || '';
  if (!fileName || !getExtension(fileName)) {
    // Try Content-Type header
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
    const ext = CONTENT_TYPE_TO_EXT[contentType] || '';

    if (ext) {
      fileName = `attachment${ext}`;
    } else {
      // Try magic bytes detection
      const detectedExt = detectFileType(fileBuffer);
      fileName = detectedExt ? `attachment${detectedExt}` : 'attachment.bin';
    }

    // Try Content-Disposition header for filename
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";\n]+)/i);
      if (filenameMatch) {
        fileName = decodeURIComponent(filenameMatch[1].trim());
      }
    }
  }

  // Skip unsupported file types
  const ext = getExtension(fileName);
  if (ext && !['.pdf', '.hwp', '.hwpx'].includes(ext)) {
    return null;
  }

  const downloadDuration = Date.now() - startTime;

  return {
    programId,
    fileName,
    fileBuffer,
    source: 'attachmentUrl',
    downloadDuration,
  };
}

/**
 * Detect file type from magic bytes
 */
function detectFileType(buffer: Buffer): string | null {
  if (buffer.length < 8) return null;

  // PDF: starts with %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return '.pdf';
  }

  // HWP: starts with OLE compound document signature (D0 CF 11 E0)
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
    return '.hwp';
  }

  // HWPX/ZIP: starts with PK (50 4B)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return '.hwpx';
  }

  return null;
}

/**
 * Extract file extension (lowercase)
 */
function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
}

/**
 * Extract filename from URL, with fallback
 */
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      return decodeURIComponent(lastPart);
    }
  } catch {
    // URL parsing failed
  }
  return 'announcement.pdf';
}
