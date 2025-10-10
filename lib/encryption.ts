/**
 * AES-256-GCM Encryption Utility for 사업자등록번호 (Business Registration Numbers)
 *
 * PIPA Compliance: Personal Information Protection Act (개인정보보호법)
 * - Business registration numbers combined with company names are considered personal information
 * - Must be encrypted at rest in the database
 * - Decryption access must be logged for audit trails
 * - Key rotation recommended every 90 days
 *
 * Performance: ~1-2 microseconds per operation (hardware AES-NI acceleration)
 * Security: AES-256-GCM provides both encryption and authentication
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * Must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (keyHex.length !== 64) {
    // 32 bytes = 64 hex characters
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Generate a new encryption key (for initial setup or rotation)
 *
 * Usage:
 * ```bash
 * node -e "console.log(require('./lib/encryption').generateKey())"
 * ```
 */
export function generateKey(): string {
  const key = crypto.randomBytes(32); // 256 bits
  return key.toString('hex');
}

/**
 * Encrypt a business registration number (사업자등록번호)
 *
 * @param plaintext - The business registration number to encrypt (e.g., "123-45-67890")
 * @returns Encrypted string in format: iv:authTag:encrypted (all hex-encoded)
 *
 * @example
 * ```typescript
 * const encrypted = encrypt("123-45-67890");
 * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 * ```
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.trim().length === 0) {
    throw new Error('Plaintext cannot be empty');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted (all hex-encoded)
  return [iv.toString('hex'), authTag.toString('hex'), encrypted].join(':');
}

/**
 * Decrypt a business registration number (사업자등록번호)
 *
 * @param encryptedData - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted business registration number
 *
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 *
 * @example
 * ```typescript
 * const decrypted = decrypt("a1b2c3d4....:e5f6g7h8....:i9j0k1l2....");
 * // Returns: "123-45-67890"
 * ```
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData || encryptedData.trim().length === 0) {
    throw new Error('Encrypted data cannot be empty');
  }

  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted data format. Expected: iv:authTag:encrypted'
    );
  }

  const [ivHex, authTagHex, encrypted] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Log decryption failures for security monitoring
    console.error('Decryption failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });

    throw new Error('Decryption failed. Data may be tampered or key is incorrect.');
  }
}

/**
 * Audit log for decryption access (PIPA compliance requirement)
 *
 * @param userId - User ID who accessed the encrypted data
 * @param organizationId - Organization ID whose data was accessed
 * @param purpose - Purpose of decryption (e.g., "viewing profile", "admin audit")
 *
 * Usage: Call this function EVERY time you decrypt sensitive data
 *
 * @example
 * ```typescript
 * const decrypted = decrypt(encryptedBusinessNumber);
 * await logDecryptionAccess(userId, organizationId, "viewing profile");
 * ```
 */
export async function logDecryptionAccess(
  userId: string,
  organizationId: string,
  purpose: string
): Promise<void> {
  // Log to database for audit trail
  // This is critical for PIPA compliance - all access to personal information must be logged

  // Example implementation (requires Prisma client)
  try {
    // await prisma.auditLog.create({
    //   data: {
    //     userId,
    //     action: 'DECRYPT_BUSINESS_NUMBER',
    //     resourceType: 'organization',
    //     resourceId: organizationId,
    //     purpose,
    //     timestamp: new Date(),
    //     ipAddress: 'server',  // In API routes, get from request headers
    //   },
    // });

    console.log('Decryption access logged:', {
      userId,
      organizationId,
      purpose,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log decryption access:', error);
    // Don't throw error - logging failure should not block decryption
  }
}

/**
 * Validate business registration number format (Korean format)
 *
 * Format: XXX-XX-XXXXX (10 digits with dashes)
 * @param businessNumber - Business registration number to validate
 * @returns true if valid format, false otherwise
 *
 * @example
 * ```typescript
 * validateBusinessNumber("123-45-67890"); // true
 * validateBusinessNumber("12345"); // false
 * ```
 */
export function validateBusinessNumber(businessNumber: string): boolean {
  // Korean business registration number format: XXX-XX-XXXXX
  const pattern = /^\d{3}-\d{2}-\d{5}$/;
  return pattern.test(businessNumber);
}

/**
 * Hash a business registration number for searching (one-way)
 *
 * Use case: Allow searching by business number without storing plaintext
 * Note: Use encryption (not hashing) for storage so data can be recovered
 *
 * @param businessNumber - Business registration number to hash
 * @returns SHA-256 hash (hex-encoded)
 */
export function hashBusinessNumber(businessNumber: string): string {
  return crypto.createHash('sha256').update(businessNumber).digest('hex');
}

/**
 * Key rotation utility - Re-encrypt data with a new key
 *
 * Recommended: Rotate encryption key every 90 days
 *
 * @param oldEncryptedData - Data encrypted with old key
 * @param oldKey - Old encryption key (hex-encoded)
 * @param newKey - New encryption key (hex-encoded)
 * @returns Re-encrypted data with new key
 *
 * Usage:
 * 1. Generate new key: `generateKey()`
 * 2. For each encrypted record in database:
 *    - Decrypt with old key
 *    - Re-encrypt with new key
 *    - Update database
 * 3. Update ENCRYPTION_KEY environment variable
 * 4. Restart application
 *
 * @example
 * ```typescript
 * const oldKey = process.env.ENCRYPTION_KEY;
 * const newKey = generateKey();
 *
 * // Re-encrypt all records
 * const organizations = await prisma.organization.findMany();
 * for (const org of organizations) {
 *   const reencrypted = rotateKey(org.business_number_encrypted, oldKey, newKey);
 *   await prisma.organization.update({
 *     where: { id: org.id },
 *     data: { business_number_encrypted: reencrypted },
 *   });
 * }
 * ```
 */
export function rotateKey(
  oldEncryptedData: string,
  oldKey: string,
  newKey: string
): string {
  // Temporarily set old key for decryption
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = oldKey;

  const decrypted = decrypt(oldEncryptedData);

  // Set new key for encryption
  process.env.ENCRYPTION_KEY = newKey;

  const reencrypted = encrypt(decrypted);

  // Restore original key
  process.env.ENCRYPTION_KEY = originalKey;

  return reencrypted;
}

/**
 * Benchmark encryption performance
 *
 * Usage: Test encryption speed on your server
 * Expected: <1ms per operation on modern hardware with AES-NI
 *
 * @example
 * ```bash
 * ts-node -e "require('./lib/encryption').benchmarkEncryption()"
 * ```
 */
export function benchmarkEncryption(iterations: number = 1000): void {
  const testData = '123-45-67890';

  console.log(`Running encryption benchmark (${iterations} iterations)...`);

  const startEncrypt = Date.now();
  const encrypted: string[] = [];
  for (let i = 0; i < iterations; i++) {
    encrypted.push(encrypt(testData));
  }
  const encryptTime = Date.now() - startEncrypt;

  const startDecrypt = Date.now();
  for (let i = 0; i < iterations; i++) {
    decrypt(encrypted[i]);
  }
  const decryptTime = Date.now() - startDecrypt;

  console.log(`Encryption: ${encryptTime}ms (${(encryptTime / iterations).toFixed(2)}ms per operation)`);
  console.log(`Decryption: ${decryptTime}ms (${(decryptTime / iterations).toFixed(2)}ms per operation)`);
  console.log(`Total: ${encryptTime + decryptTime}ms`);

  // Expected results on modern hardware:
  // Encryption: <500ms (< 0.5ms per operation)
  // Decryption: <500ms (< 0.5ms per operation)
}

// Export all functions
export default {
  generateKey,
  encrypt,
  decrypt,
  logDecryptionAccess,
  validateBusinessNumber,
  hashBusinessNumber,
  rotateKey,
  benchmarkEncryption,
};