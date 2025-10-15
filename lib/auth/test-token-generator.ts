/**
 * Test JWT Token Generator
 *
 * Generates JWT tokens for load testing and development purposes.
 * Compatible with NextAuth.js JWT strategy.
 *
 * Usage:
 * ```typescript
 * import { generateTestToken } from '@/lib/auth/test-token-generator';
 *
 * const token = await generateTestToken('user-id', 'test@connectplt.kr');
 * // Use in Authorization header: `Bearer ${token}`
 * ```
 */

import { SignJWT } from 'jose';

/**
 * Generates a test JWT token for load testing
 *
 * @param userId - User ID (UUID)
 * @param email - User email
 * @param role - User role (default: 'USER')
 * @param organizationId - Organization ID (optional)
 * @returns JWT token string
 */
export async function generateTestToken(
  userId: string,
  email: string,
  role: 'USER' | 'ADMIN' = 'USER',
  organizationId?: string
): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev_jwt_secret_change_in_production'
  );

  // Create token payload matching NextAuth JWT structure
  const token = await new SignJWT({
    userId,
    email,
    role,
    organizationId: organizationId || null,
    // NextAuth JWT standard claims
    name: `Test User (${email})`,
    sub: userId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Valid for 1 hour
    .sign(secret);

  return token;
}

/**
 * Generates multiple test tokens for concurrent load testing
 *
 * @param count - Number of tokens to generate
 * @param baseEmail - Base email (will append index)
 * @returns Array of JWT tokens
 */
export async function generateTestTokens(
  count: number,
  baseEmail: string = 'loadtest@connectplt.kr'
): Promise<string[]> {
  const tokens: string[] = [];

  for (let i = 0; i < count; i++) {
    const email = baseEmail.replace('@', `+${i}@`);
    const userId = `test-user-${i}`;
    const token = await generateTestToken(userId, email);
    tokens.push(token);
  }

  return tokens;
}

/**
 * Generates an admin test token
 *
 * @param userId - Admin user ID (default: 'admin-user-id')
 * @param email - Admin email (default: 'admin@connectplt.kr')
 * @returns JWT token string
 */
export async function generateAdminTestToken(
  userId: string = 'admin-user-id',
  email: string = 'admin@connectplt.kr'
): Promise<string> {
  return generateTestToken(userId, email, 'ADMIN');
}
