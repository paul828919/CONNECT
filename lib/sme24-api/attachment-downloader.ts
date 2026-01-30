/**
 * SME Attachment Downloader
 *
 * Downloads HWP/PDF announcement files from SME program URLs.
 * Prioritizes formats: PDF > HWPX > HWP for optimal text extraction.
 *
 * Sources (in priority order):
 * 1. Direct HTTP GET from attachmentUrls[]
 * 2. announcementFileUrl fallback
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
  source: 'attachmentUrl' | 'announcementFileUrl';
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
}

// ============================================================================
// Configuration
// ============================================================================

const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/** Supported extensions ordered by extraction quality */
const SUPPORTED_EXTENSIONS = ['.pdf', '.hwpx', '.hwp'];

// ============================================================================
// Main Download Function
// ============================================================================

/**
 * Download announcement attachments from an SME program
 *
 * Tries attachmentUrls first (prioritizing PDF > HWPX > HWP),
 * then falls back to announcementFileUrl.
 *
 * @param program SME program with attachment URLs
 * @returns Array of successfully downloaded files
 */
export async function downloadSMEAttachments(
  program: SMEProgramInput
): Promise<{ results: DownloadResult[]; errors: DownloadError[] }> {
  const results: DownloadResult[] = [];
  const errors: DownloadError[] = [];

  // Sort attachments by format priority (PDF first)
  const sortedAttachments = getSortedAttachments(program);

  // Try each attachment URL
  for (const { url, fileName } of sortedAttachments) {
    try {
      const result = await downloadFile(url, fileName, program.id, 'attachmentUrl');
      if (result) {
        results.push(result);
        // Return after first successful download — one document is usually sufficient
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

  // Fallback: try announcementFileUrl
  if (results.length === 0 && program.announcementFileUrl) {
    try {
      const fileName = extractFileNameFromUrl(program.announcementFileUrl);
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
 * Sort attachments by extraction quality priority: PDF > HWPX > HWP
 * Filters out unsupported file types.
 */
function getSortedAttachments(
  program: SMEProgramInput
): Array<{ url: string; fileName: string }> {
  const attachments: Array<{ url: string; fileName: string; priority: number }> = [];

  for (let i = 0; i < program.attachmentUrls.length; i++) {
    const url = program.attachmentUrls[i];
    const fileName = program.attachmentNames[i] || `attachment_${i}`;
    const ext = getExtension(fileName);
    const priority = SUPPORTED_EXTENSIONS.indexOf(ext);

    if (priority !== -1) {
      attachments.push({ url, fileName, priority });
    }
  }

  // Sort by priority (lower index = higher priority)
  return attachments.sort((a, b) => a.priority - b.priority);
}

/**
 * Download a single file via HTTP GET
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

  // Validate downloaded size
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
