/**
 * Q&A Chat API Endpoint
 * POST /api/chat - Send a message
 * GET /api/chat - Get user's conversations
 *
 * Week 3-4: AI Integration (Day 18-19)
 *
 * Features:
 * - Create new conversation or continue existing
 * - Multi-turn conversation with context
 * - Rate limiting (10 messages/minute per user)
 * - Company context personalization
 * - Error handling and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { PrismaClient } from '@prisma/client';
import {
  sendQAChatWithRateLimit,
  startNewConversation,
  getUserConversations,
  CompanyContext,
  RelevantProgram,
} from '@/lib/ai/services/qa-chat';

const prisma = new PrismaClient();

/**
 * POST /api/chat
 * Send a new message in a conversation
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse request body
    const body = await request.json();
    const { conversationId, message, newConversation } = body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: '메시지를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Bad Request', message: '메시지는 2000자 이하로 입력해주세요.' },
        { status: 400 }
      );
    }

    // 3. Get user's organization for company context
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        organizations: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not Found', message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Build company context (if organization exists)
    let companyContext: CompanyContext | undefined;
    if (user.organizations) {
      const org = user.organizations;
      companyContext = {
        name: org.name,
        industry: org.industrySector || '정보 없음',
        trl: org.trlLevel || 0,
        revenue: Number(org.revenue || 0),
        certifications: org.certifications || [],
        rdExperience: org.rdExperience || 0,
      };
    }

    // TODO: Fetch relevant programs based on user's query
    // For now, leave empty - can be enhanced later with semantic search
    const relevantPrograms: RelevantProgram[] | undefined = undefined;

    // 4. Handle new conversation vs. existing conversation
    if (newConversation || !conversationId) {
      // Start new conversation
      const result = await startNewConversation(userId, message.trim(), companyContext);

      return NextResponse.json({
        success: true,
        conversationId: result.conversationId,
        message: result.response?.answer,
        messageId: result.response?.messageId,
        usage: result.response?.usage,
        cost: result.response?.cost,
        responseTime: result.response?.responseTime,
        contextUsed: result.response?.contextUsed,
      });
    } else {
      // Continue existing conversation
      const response = await sendQAChatWithRateLimit({
        conversationId,
        userId,
        userQuestion: message.trim(),
        companyContext,
        relevantPrograms,
      });

      return NextResponse.json({
        success: true,
        conversationId: response.conversationId,
        message: response.answer,
        messageId: response.messageId,
        usage: response.usage,
        cost: response.cost,
        responseTime: response.responseTime,
        contextUsed: response.contextUsed,
      });
    }
  } catch (error: any) {
    console.error('Chat API Error:', error);

    // Handle specific errors
    if (error.message?.includes('Rate limit') || error.message?.includes('한도')) {
      return NextResponse.json(
        {
          error: 'Rate Limit Exceeded',
          message: error.message,
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('Daily budget') || error.message?.includes('예산')) {
      return NextResponse.json(
        {
          error: 'Service Unavailable',
          message: 'AI 서비스 일일 예산을 초과했습니다. 내일 다시 시도해주세요.',
        },
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 * Get all conversations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Get user's conversations
    const conversations = await getUserConversations(userId);

    return NextResponse.json({
      success: true,
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messageCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get Conversations Error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '대화 목록을 불러오는 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
