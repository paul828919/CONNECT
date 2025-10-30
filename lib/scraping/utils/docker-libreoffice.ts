/**
 * Docker LibreOffice Conversion Helper
 *
 * Delegates HWP → PDF conversion to Docker container's LibreOffice.
 * Solves the issue where macOS LibreOffice lacks proper HWP 5.0 (CFBF) import filter.
 *
 * Strategy:
 * 1. Detect if running inside Docker (check for /.dockerenv file)
 * 2. If in Docker: Use local LibreOffice directly
 * 3. If on host: Delegate to Docker container's LibreOffice via docker exec
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import pdfParse from 'pdf-parse';

/**
 * Check if currently running inside a Docker container
 */
function isRunningInDocker(): boolean {
  try {
    // Docker containers have /.dockerenv file
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

/**
 * Get the appropriate scraper container name based on environment
 *
 * Development: connect_dev_scraper
 * Production: connect_scraper
 */
function getScraperContainerName(): string {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? 'connect_dev_scraper' : 'connect_scraper';
}

/**
 * Sanitize filename for safe use in Docker commands
 * Docker cp doesn't handle non-ASCII characters well, so use only alphanumeric + random suffix
 */
function sanitizeFileName(fileName: string): string {
  // Generate a longer random suffix to ensure uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 12);

  // Extract extension
  const ext = path.extname(fileName); // e.g., ".hwp"

  // Use only the random suffix + extension to avoid ALL special character issues
  // This is the safest approach for Docker cp with Korean filenames
  return `hwp_${randomSuffix}${ext}`;
}

/**
 * Convert HWP file to PDF using Docker container's LibreOffice
 *
 * @param hwpBuffer - HWP file content as Buffer
 * @param fileName - Original file name (for logging and temp file naming)
 * @returns PDF file content as Buffer, or null if conversion fails
 */
export async function convertHWPToPDFViaDocker(
  hwpBuffer: Buffer,
  fileName: string
): Promise<Buffer | null> {
  const inDocker = isRunningInDocker();

  if (inDocker) {
    // Already in Docker - use local LibreOffice directly
    return convertHWPToPDFLocal(hwpBuffer, fileName);
  } else {
    // On host - delegate to Docker container
    return convertHWPToPDFDockerExec(hwpBuffer, fileName);
  }
}

/**
 * Convert HWP to PDF using local LibreOffice (when already inside Docker)
 */
async function convertHWPToPDFLocal(
  hwpBuffer: Buffer,
  fileName: string
): Promise<Buffer | null> {
  let tempDir: string | null = null;

  try {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwp-docker-local-'));
    const hwpPath = path.join(tempDir, fileName);
    const pdfFileName = fileName.replace(/\.hwp$/i, '.pdf');
    const pdfPath = path.join(tempDir, pdfFileName);

    // Write HWP file
    fs.writeFileSync(hwpPath, hwpBuffer);

    console.log(`[DOCKER-LIBREOFFICE] Converting HWP → PDF (local): ${fileName}`);

    // Convert using local LibreOffice
    const convertCmd = `soffice --headless --convert-to pdf --outdir "${tempDir}" "${hwpPath}"`;
    execSync(convertCmd, {
      timeout: 30000,
      stdio: 'pipe',
    });

    // Check if PDF was created
    if (!fs.existsSync(pdfPath)) {
      console.error('[DOCKER-LIBREOFFICE] PDF conversion failed - output file not found');
      return null;
    }

    // Read and return PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`[DOCKER-LIBREOFFICE] ✓ Converted: ${pdfBuffer.length} bytes`);

    // Cleanup
    if (fs.existsSync(hwpPath)) fs.unlinkSync(hwpPath);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);

    return pdfBuffer;
  } catch (error: any) {
    console.error(`[DOCKER-LIBREOFFICE] Local conversion failed:`, error.message);

    // Cleanup on error
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => fs.unlinkSync(path.join(tempDir!, file)));
        fs.rmdirSync(tempDir);
      } catch {
        // Silent fail on cleanup
      }
    }

    return null;
  }
}

/**
 * Convert HWP to PDF by delegating to Docker container (when running on host)
 */
async function convertHWPToPDFDockerExec(
  hwpBuffer: Buffer,
  fileName: string
): Promise<Buffer | null> {
  let hostTempDir: string | null = null;

  try {
    // 1. Create temp directory on host
    hostTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwp-docker-host-'));

    // Use sanitized filenames to avoid shell escaping issues with special characters
    const sanitizedFileName = sanitizeFileName(fileName);
    const sanitizedPdfFileName = sanitizedFileName.replace(/\.hwp$/i, '.pdf');

    const hostHwpPath = path.join(hostTempDir, sanitizedFileName);
    const hostPdfPath = path.join(hostTempDir, sanitizedPdfFileName);

    // 2. Write HWP file to host temp directory
    fs.writeFileSync(hostHwpPath, hwpBuffer);

    console.log(`[DOCKER-LIBREOFFICE] Converting HWP → PDF via Docker: ${fileName}`);
    console.log(`[DOCKER-LIBREOFFICE-DEBUG] Host temp dir: ${hostTempDir}`);

    // 3. Copy HWP file to Docker container
    const containerName = getScraperContainerName(); // Use scraper container (has LibreOffice + Java)
    const containerTempDir = '/tmp/hwp-conversion';

    console.log(`[DOCKER-LIBREOFFICE-DEBUG] Using container: ${containerName}`);

    // Create temp dir in container
    try {
      execSync(`docker exec ${containerName} mkdir -p ${containerTempDir}`, {
        stdio: 'pipe',
      });
    } catch {
      // Directory might already exist - not critical
    }

    const containerHwpPath = `${containerTempDir}/${sanitizedFileName}`;
    const containerPdfPath = `${containerTempDir}/${sanitizedPdfFileName}`;

    // Copy HWP to container (using sanitized filename avoids shell escaping issues)
    execSync(`docker cp "${hostHwpPath}" ${containerName}:${containerHwpPath}`, {
      timeout: 10000,
      stdio: 'pipe',
    });

    console.log(`[DOCKER-LIBREOFFICE-DEBUG] Copied HWP to container: ${containerHwpPath}`);

    // 4. Run LibreOffice conversion inside container
    const convertCmd = `docker exec ${containerName} soffice --headless --convert-to pdf --outdir ${containerTempDir} ${containerHwpPath}`;

    execSync(convertCmd, {
      timeout: 30000,
      stdio: 'pipe',
    });

    console.log(`[DOCKER-LIBREOFFICE-DEBUG] Conversion executed in container`);

    // 5. Copy PDF back from container to host
    try {
      execSync(`docker cp ${containerName}:${containerPdfPath} "${hostPdfPath}"`, {
        timeout: 10000,
        stdio: 'pipe',
      });
    } catch (error: any) {
      console.error('[DOCKER-LIBREOFFICE] Failed to copy PDF from container:', error.message);

      // Check if PDF was created in container
      try {
        const lsOutput = execSync(`docker exec ${containerName} ls -la ${containerTempDir}`, {
          encoding: 'utf-8',
        });
        console.error(`[DOCKER-LIBREOFFICE-DEBUG] Container temp dir contents:\n${lsOutput}`);
      } catch {
        // Silent fail
      }

      return null;
    }

    console.log(`[DOCKER-LIBREOFFICE-DEBUG] Copied PDF from container to host`);

    // 6. Read PDF from host
    if (!fs.existsSync(hostPdfPath)) {
      console.error('[DOCKER-LIBREOFFICE] PDF not found on host after copy');
      return null;
    }

    const pdfBuffer = fs.readFileSync(hostPdfPath);
    console.log(`[DOCKER-LIBREOFFICE] ✓ Converted via Docker: ${pdfBuffer.length} bytes`);

    // 7. Cleanup
    // Clean up host files
    try {
      if (fs.existsSync(hostHwpPath)) fs.unlinkSync(hostHwpPath);
      if (fs.existsSync(hostPdfPath)) fs.unlinkSync(hostPdfPath);
      if (fs.existsSync(hostTempDir)) fs.rmdirSync(hostTempDir);
    } catch {
      // Silent fail on cleanup
    }

    // Clean up container files
    try {
      execSync(
        `docker exec ${containerName} sh -c "rm -f ${containerHwpPath} ${containerPdfPath}"`,
        { stdio: 'pipe', timeout: 5000 }
      );
    } catch {
      // Silent fail on cleanup
    }

    return pdfBuffer;
  } catch (error: any) {
    console.error(`[DOCKER-LIBREOFFICE] Docker exec conversion failed:`, error.message);

    // Cleanup on error
    if (hostTempDir && fs.existsSync(hostTempDir)) {
      try {
        const files = fs.readdirSync(hostTempDir);
        files.forEach(file => fs.unlinkSync(path.join(hostTempDir!, file)));
        fs.rmdirSync(hostTempDir);
      } catch {
        // Silent fail on cleanup
      }
    }

    return null;
  }
}

/**
 * Convert HWP file to PDF and extract text (replaces Hancom Docs workflow)
 *
 * @param hwpBuffer - HWP file content as Buffer
 * @param fileName - Original file name (for logging)
 * @returns Extracted text from PDF, or null if conversion fails
 */
export async function convertHWPAndExtractText(
  hwpBuffer: Buffer,
  fileName: string
): Promise<string | null> {
  try {
    console.log(`[LIBREOFFICE] Converting HWP → PDF → text: ${fileName}`);

    // 1. Convert HWP → PDF
    const pdfBuffer = await convertHWPToPDFViaDocker(hwpBuffer, fileName);

    if (!pdfBuffer) {
      console.error('[LIBREOFFICE] HWP → PDF conversion failed');
      return null;
    }

    console.log(`[LIBREOFFICE] ✓ PDF created: ${pdfBuffer.length} bytes`);

    // 2. Extract text from PDF
    const data = await pdfParse(pdfBuffer);
    const text = data.text.trim();

    if (text.length === 0) {
      console.warn('[LIBREOFFICE] PDF contains no text (might be empty or scanned images)');
      return null;
    }

    console.log(
      `[LIBREOFFICE] ✓ Text extracted: ${text.length} characters (returning first 5000)`
    );

    // Return first 5000 characters for performance (matching attachment-parser pattern)
    return text.substring(0, 5000);
  } catch (error: any) {
    console.error(`[LIBREOFFICE] HWP text extraction failed for ${fileName}:`, error.message);
    return null;
  }
}

/**
 * Check if Docker container is running and accessible
 *
 * @returns true if Docker container is accessible, false otherwise
 */
export function checkDockerContainerAccessible(): boolean {
  if (isRunningInDocker()) {
    // Already in Docker - no need to check external container
    return true;
  }

  try {
    const containerName = getScraperContainerName();
    execSync(`docker exec ${containerName} echo "test"`, {
      stdio: 'pipe',
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}
