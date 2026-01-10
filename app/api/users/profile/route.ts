/**
 * User Profile API
 *
 * GET: Retrieve current user's professional profile
 * PATCH: Update current user's professional profile (LinkedIn, Remember, position, visibility)
 *
 * These fields are used for trust verification in partner search/consortium discovery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for profile update
const updateProfileSchema = z.object({
  linkedinUrl: z
    .string()
    .url('올바른 LinkedIn URL 형식을 입력해주세요.')
    .regex(
      /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/,
      'LinkedIn 프로필 URL 형식이 올바르지 않습니다.'
    )
    .nullable()
    .optional()
    .or(z.literal('')),
  rememberUrl: z
    .string()
    .url('올바른 리멤버 URL 형식을 입력해주세요.')
    .regex(
      /^https?:\/\/(www\.)?rememberapp\.co\.kr\/.*$/,
      '리멤버 프로필 URL 형식이 올바르지 않습니다.'
    )
    .nullable()
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(50, '직책은 50자 이하로 입력해주세요.')
    .nullable()
    .optional()
    .or(z.literal('')),
  showOnPartnerProfile: z.boolean().optional(),
});

// GET: Retrieve current user's professional profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        linkedinUrl: true,
        rememberUrl: true,
        position: true,
        showOnPartnerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      linkedinUrl: user.linkedinUrl,
      rememberUrl: user.rememberUrl,
      position: user.position,
      showOnPartnerProfile: user.showOnPartnerProfile,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update current user's professional profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { linkedinUrl, rememberUrl, position, showOnPartnerProfile } = validationResult.data;

    // Transform empty strings to null for database storage
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        linkedinUrl: linkedinUrl && linkedinUrl.trim() !== '' ? linkedinUrl.trim() : null,
        rememberUrl: rememberUrl && rememberUrl.trim() !== '' ? rememberUrl.trim() : null,
        position: position && position.trim() !== '' ? position.trim() : null,
        showOnPartnerProfile: showOnPartnerProfile ?? false,
      },
      select: {
        id: true,
        linkedinUrl: true,
        rememberUrl: true,
        position: true,
        showOnPartnerProfile: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
