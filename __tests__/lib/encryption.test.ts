/**
 * Unit Tests for Encryption Utilities
 *
 * Tests AES-256-GCM encryption for business registration numbers (PIPA compliance)
 */

import {
  encrypt,
  decrypt,
  validateBusinessNumber,
  hashBusinessNumber,
  generateKey,
  rotateKey,
} from '@/lib/encryption';

describe('Encryption Utilities', () => {
  // Set up test encryption key
  const TEST_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  describe('generateKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateKey();
      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encrypt', () => {
    it('should encrypt a business registration number', () => {
      const plaintext = '123-45-67890';
      const encrypted = encrypt(plaintext);

      // Check format: iv:authTag:encrypted (all hex)
      expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // IV should be 32 hex chars (16 bytes)
      expect(parts[0]).toHaveLength(32);

      // Auth tag should be 32 hex chars (16 bytes)
      expect(parts[1]).toHaveLength(32);

      // Encrypted data length varies but should exist
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = '123-45-67890';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error for empty plaintext', () => {
      expect(() => encrypt('')).toThrow('Plaintext cannot be empty');
      expect(() => encrypt('   ')).toThrow('Plaintext cannot be empty');
    });

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('123-45-67890')).toThrow('ENCRYPTION_KEY environment variable is not set');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error if ENCRYPTION_KEY has wrong length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'too_short';

      expect(() => encrypt('123-45-67890')).toThrow('ENCRYPTION_KEY must be 64 hex characters');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted business registration number', () => {
      const plaintext = '123-45-67890';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should work with various business number formats', () => {
      const testCases = [
        '123-45-67890',
        '000-00-00000',
        '999-99-99999',
        '456-78-91234',
      ];

      testCases.forEach((businessNumber) => {
        const encrypted = encrypt(businessNumber);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(businessNumber);
      });
    });

    it('should throw error for empty encrypted data', () => {
      expect(() => decrypt('')).toThrow('Encrypted data cannot be empty');
      expect(() => decrypt('   ')).toThrow('Encrypted data cannot be empty');
    });

    it('should throw error for invalid format (missing parts)', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('only:two')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('too:many:parts:here')).toThrow('Invalid encrypted data format');
    });

    it('should throw error for tampered data', () => {
      const plaintext = '123-45-67890';
      const encrypted = encrypt(plaintext);

      // Tamper with the encrypted data
      const parts = encrypted.split(':');
      parts[2] = parts[2].substring(0, parts[2].length - 2) + 'ff'; // Change last byte
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow('Decryption failed');
    });

    it('should throw error for wrong encryption key', () => {
      const plaintext = '123-45-67890';
      const encrypted = encrypt(plaintext);

      // Change the encryption key
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = generateKey();

      expect(() => decrypt(encrypted)).toThrow('Decryption failed');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('validateBusinessNumber', () => {
    it('should validate correct Korean business registration number format', () => {
      const validNumbers = [
        '123-45-67890',
        '000-00-00000',
        '999-99-99999',
        '456-78-91234',
      ];

      validNumbers.forEach((number) => {
        expect(validateBusinessNumber(number)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidNumbers = [
        '12345-67890',       // Wrong dash positions
        '123-456-7890',      // Wrong dash positions
        '123456789',         // No dashes
        '123-45-6789',       // Too short
        '123-45-678901',     // Too long
        'abc-de-fghij',      // Non-numeric
        '123-45-6789a',      // Contains letter
        '123-45- 67890',     // Contains space
        '',                  // Empty
        '   ',               // Whitespace only
      ];

      invalidNumbers.forEach((number) => {
        expect(validateBusinessNumber(number)).toBe(false);
      });
    });
  });

  describe('hashBusinessNumber', () => {
    it('should create SHA-256 hash of business number', () => {
      const businessNumber = '123-45-67890';
      const hash = hashBusinessNumber(businessNumber);

      // SHA-256 produces 64 hex characters
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('should be deterministic (same input = same hash)', () => {
      const businessNumber = '123-45-67890';
      const hash1 = hashBusinessNumber(businessNumber);
      const hash2 = hashBusinessNumber(businessNumber);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashBusinessNumber('123-45-67890');
      const hash2 = hashBusinessNumber('123-45-67891');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce specific hash for known input', () => {
      // This allows detecting if hashing algorithm changes
      const businessNumber = '123-45-67890';
      const expectedHash = '32d29c0fcf517a61733bdeb48c389fe41e964946bfe67f67c8173900f706c465';

      const hash = hashBusinessNumber(businessNumber);
      expect(hash).toBe(expectedHash);
    });
  });

  describe('rotateKey', () => {
    it('should re-encrypt data with a new key', () => {
      const plaintext = '123-45-67890';

      // Encrypt with first key
      const oldKey = TEST_ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = oldKey;
      const encryptedWithOldKey = encrypt(plaintext);

      // Generate new key
      const newKey = generateKey();

      // Rotate key
      const reencrypted = rotateKey(encryptedWithOldKey, oldKey, newKey);

      // Verify we can decrypt with new key
      process.env.ENCRYPTION_KEY = newKey;
      const decrypted = decrypt(reencrypted);

      expect(decrypted).toBe(plaintext);

      // Restore original key
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    });

    it('should produce different ciphertext after rotation', () => {
      const plaintext = '123-45-67890';

      const oldKey = TEST_ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = oldKey;
      const encryptedWithOldKey = encrypt(plaintext);

      const newKey = generateKey();
      const reencrypted = rotateKey(encryptedWithOldKey, oldKey, newKey);

      expect(reencrypted).not.toBe(encryptedWithOldKey);
    });
  });

  describe('End-to-end encryption flow', () => {
    it('should complete full encryption-decryption cycle', () => {
      const businessNumbers = [
        '123-45-67890',
        '456-78-91234',
        '999-88-77766',
      ];

      businessNumbers.forEach((original) => {
        // 1. Validate format
        expect(validateBusinessNumber(original)).toBe(true);

        // 2. Encrypt
        const encrypted = encrypt(original);
        expect(encrypted).toBeTruthy();

        // 3. Decrypt
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(original);

        // 4. Hash for search index
        const hash = hashBusinessNumber(original);
        expect(hash).toHaveLength(64);
      });
    });

    it('should handle encryption of multiple records', () => {
      const records = [
        { name: '테크노베이션', businessNumber: '123-45-67890' },
        { name: '이노베이션랩', businessNumber: '456-78-91234' },
        { name: '연구개발센터', businessNumber: '789-01-23456' },
      ];

      const encrypted = records.map((record) => ({
        name: record.name,
        businessNumberEncrypted: encrypt(record.businessNumber),
        businessNumberHash: hashBusinessNumber(record.businessNumber),
      }));

      // Verify all encrypted
      expect(encrypted).toHaveLength(3);
      encrypted.forEach((record) => {
        expect(record.businessNumberEncrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
        expect(record.businessNumberHash).toHaveLength(64);
      });

      // Verify can decrypt all
      encrypted.forEach((record, idx) => {
        const decrypted = decrypt(record.businessNumberEncrypted);
        expect(decrypted).toBe(records[idx].businessNumber);
      });
    });
  });

  describe('Performance benchmarks', () => {
    it('should encrypt quickly (< 5ms per operation)', () => {
      const plaintext = '123-45-67890';
      const iterations = 100;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        encrypt(plaintext);
      }
      const elapsed = Date.now() - start;

      const avgTime = elapsed / iterations;
      expect(avgTime).toBeLessThan(5); // Should be well under 5ms with AES-NI
    });

    it('should decrypt quickly (< 5ms per operation)', () => {
      const plaintext = '123-45-67890';
      const encrypted = encrypt(plaintext);
      const iterations = 100;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        decrypt(encrypted);
      }
      const elapsed = Date.now() - start;

      const avgTime = elapsed / iterations;
      expect(avgTime).toBeLessThan(5); // Should be well under 5ms with AES-NI
    });
  });

  describe('Security edge cases', () => {
    it('should handle Unicode characters', () => {
      const plaintext = '한국-기업-12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long strings', () => {
      const plaintext = '123-45-67890'.repeat(100); // 1200 characters
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should reject non-hex encryption keys', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'; // Invalid hex

      expect(() => encrypt('123-45-67890')).toThrow();

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
