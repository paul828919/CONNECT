/**
 * AI Feedback API Endpoint
 * POST /api/ai-feedback
 *
 * Allows users to rate AI responses (thumbs up/down) for match explanations and Q&A chat
 *
 * Week 6: AI Feature Polish
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AIFeedbackRequestBody {
  serviceType: 'MATCH_EXPLANATION' | 'QA_CHAT';
  resourceId: string; // match ID or message ID
  rating: 'HELPFUL' | 'NOT_HELPFUL';
  comment?: string;
}

/**
 * POST /api/ai-feedback
 * Submit feedback for AI-generated content
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: AIFeedbackRequestBody = await req.json();

    // Validate required fields
    if (!body.serviceType || !body.resourceId || !body.rating) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: serviceType, resourceId, rating',
        },
        { status: 400 }
      );
    }

    // Validate serviceType
    const validServiceTypes = ['MATCH_EXPLANATION', 'QA_CHAT'];
    if (!validServiceTypes.includes(body.serviceType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid serviceType. Must be one of: ${validServiceTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate rating
    const validRatings = ['HELPFUL', 'NOT_HELPFUL'];
    if (!validRatings.includes(body.rating)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid rating. Must be one of: ${validRatings.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get authenticated user (optional - allow anonymous feedback)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // Get organization ID if user is logged in
    let organizationId: string | null = null;
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      organizationId = user?.organizationId || null;
    }

    // Check if user already gave feedback for this resource
    if (userId) {
      const existingFeedback = await db.ai_feedback.findFirst({
        where: {
          userId,
          serviceType: body.serviceType,
          resourceId: body.resourceId,
        },
      });

      if (existingFeedback) {
        // Update existing feedback
        const updated = await db.ai_feedback.update({
          where: { id: existingFeedback.id },
          data: {
            rating: body.rating,
            comment: body.comment || null,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json(
          {
            success: true,
            feedback: {
              id: updated.id,
              rating: updated.rating,
              updatedAt: updated.updatedAt,
            },
            message: 'Feedback updated',
          },
          { status: 200 }
        );
      }
    }

    // Create new feedback
    const feedback = await db.ai_feedback.create({
      data: {
        id: nanoid(),
        serviceType: body.serviceType,
        resourceId: body.resourceId,
        userId,
        organizationId,
        rating: body.rating,
        comment: body.comment || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        feedback: {
          id: feedback.id,
          rating: feedback.rating,
          createdAt: feedback.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating AI feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create AI feedback',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-feedback?serviceType=MATCH_EXPLANATION&resourceId=xyz
 * Get feedback stats for a resource (for admins or analytics)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceType = searchParams.get('serviceType');
    const resourceId = searchParams.get('resourceId');

    if (!serviceType || !resourceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required params: serviceType, resourceId',
        },
        { status: 400 }
      );
    }

    // Get feedback stats
    const feedbacks = await db.ai_feedback.findMany({
      where: {
        serviceType: serviceType as 'MATCH_EXPLANATION' | 'QA_CHAT',
        resourceId,
      },
      select: {
        rating: true,
        createdAt: true,
      },
    });

    const helpful = feedbacks.filter((f) => f.rating === 'HELPFUL').length;
    const notHelpful = feedbacks.filter((f) => f.rating === 'NOT_HELPFUL').length;
    const total = feedbacks.length;

    return NextResponse.json({
      success: true,
      stats: {
        helpful,
        notHelpful,
        total,
        helpfulPercentage: total > 0 ? Math.round((helpful / total) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching AI feedback stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch AI feedback stats',
      },
      { status: 500 }
    );
  }
}
