/**
 * Q&A Chat Service
 * Conversational AI for grant-related questions with conversation memory
 *
 * Week 3-4: AI Integration (Day 18-19)
 *
 * Features:
 * - Multi-turn conversation with context
 * - Company profile personalization
 * - Relevant program citations
 * - Professional Korean (존댓말)
 * - Domain-specific knowledge (TRL, certifications, agencies, procedures)
 */

import { sendAIRequest, AIResponse } from '../client';
import { buildQAChatPrompt, QAChatInput, QA_CHAT_TEMPERATURE, QA_CHAT_MAX_TOKENS } from '../prompts/qa-chat';
import { conversationManager } from '../conversation/context-manager';
import { ConversationMessage } from '../conversation/types';
import { getFallbackContent, getErrorMessage } from '../fallback-content';

/**
 * Company context for personalized responses
 */
export interface CompanyContext {
  name: string;
  industry: string;
  trl: number;
  revenue: number;
  certifications: string[];
  rdExperience: number;
}

/**
 * Relevant program for citation
 */
export interface RelevantProgram {
  title: string;
  agency: string;
  deadline: string;
  budget: string;
  matchScore?: number;
}

/**
 * Q&A Chat Request
 */
export interface QAChatRequest {
  conversationId: string;
  userId: string;
  userQuestion: string;
  companyContext?: CompanyContext;
  relevantPrograms?: RelevantProgram[];
}

/**
 * Q&A Chat Response
 */
export interface QAChatResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  cost: number;
  responseTime: number;
  contextUsed: {
    messageCount: number;
    hadSummary: boolean;
  };
}

/**
 * Main Q&A Chat function
 * Handles multi-turn conversation with context management
 */
export async function sendQAChat(request: QAChatRequest): Promise<QAChatResponse> {
  const startTime = Date.now();

  // 1. Get conversation context (last 10 messages)
  const context = await conversationManager.getContext(request.conversationId);

  // 2. Add user's question to conversation
  const userTokenCount = conversationManager.estimateTokenCount(request.userQuestion);
  const userMessage = await conversationManager.addMessage(
    request.conversationId,
    request.userId,
    'user',
    request.userQuestion,
    userTokenCount
  );

  // 3. Build prompt with context
  const promptInput: QAChatInput = {
    userQuestion: request.userQuestion,
    conversationHistory: context.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    })),
    companyContext: request.companyContext,
    relevantPrograms: request.relevantPrograms,
    currentDate: new Date().toISOString().split('T')[0],
  };

  const { system, messages } = buildQAChatPrompt(promptInput);

  // 4. Call AI with fallback handling
  try {
    const aiResponse = await sendAIRequest({
      system,
      messages: messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      maxTokens: QA_CHAT_MAX_TOKENS,
      temperature: QA_CHAT_TEMPERATURE,
      retries: 3,
      // Cost tracking metadata
      serviceType: 'QA_CHAT',
      userId: request.userId,
      organizationId: request.companyContext ? undefined : undefined, // Will add from context in API route
      endpoint: '/api/chat',
      cacheHit: false,
    });

    // 5. Save assistant's response
    const assistantTokenCount = conversationManager.estimateTokenCount(aiResponse.content);
    const assistantMessage = await conversationManager.addMessage(
      request.conversationId,
      request.userId,
      'assistant',
      aiResponse.content,
      assistantTokenCount
    );

    const endTime = Date.now();

    return {
      conversationId: request.conversationId,
      messageId: assistantMessage.id,
      answer: aiResponse.content,
      usage: aiResponse.usage,
      cost: aiResponse.cost,
      responseTime: endTime - startTime,
      contextUsed: {
        messageCount: context.messages.length,
        hadSummary: !!context.summary,
      },
    };
  } catch (error: any) {
    // Log error for debugging
    console.error('Q&A chat failed:', {
      error: error.message,
      question: request.userQuestion,
      conversationId: request.conversationId,
    });

    // Fallback strategy: Return manual fallback content
    console.warn('⚠️ Using fallback content for Q&A chat');

    const fallback = getFallbackContent('QA_CHAT', {
      question: request.userQuestion,
    });

    // Save fallback response to conversation
    const assistantTokenCount = conversationManager.estimateTokenCount(fallback.korean);
    const assistantMessage = await conversationManager.addMessage(
      request.conversationId,
      request.userId,
      'assistant',
      fallback.korean,
      assistantTokenCount
    );

    const endTime = Date.now();

    return {
      conversationId: request.conversationId,
      messageId: assistantMessage.id,
      answer: fallback.korean,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
      },
      cost: 0,
      responseTime: endTime - startTime,
      contextUsed: {
        messageCount: context.messages.length,
        hadSummary: !!context.summary,
      },
    };
  }
}

/**
 * Start a new conversation
 * Creates a new conversation and optionally sends the first message
 */
export async function startNewConversation(
  userId: string,
  firstMessage?: string,
  companyContext?: CompanyContext
): Promise<{ conversationId: string; response?: QAChatResponse }> {
  // Create new conversation
  const conversation = await conversationManager.createConversation(userId);

  // If first message provided, send it immediately
  if (firstMessage) {
    const response = await sendQAChat({
      conversationId: conversation.id,
      userId,
      userQuestion: firstMessage,
      companyContext,
    });

    return {
      conversationId: conversation.id,
      response,
    };
  }

  return {
    conversationId: conversation.id,
  };
}

/**
 * Get conversation history
 * Returns all messages in a conversation
 */
export async function getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
  const context = await conversationManager.getContext(conversationId);
  return context.messages;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  await conversationManager.deleteConversation(conversationId, userId);
}

/**
 * Get all user conversations
 */
export async function getUserConversations(userId: string) {
  return await conversationManager.getUserConversations(userId);
}

/**
 * Rate limiting check for chat
 * Limit to 10 messages per minute per user (stricter than general AI limit)
 */
async function checkChatRateLimit(userId: string): Promise<boolean> {
  const redis = (conversationManager as any).getRedisClient();
  const key = `chat:ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute ago

  // Remove old entries
  await redis.zremrangebyscore(key, '-inf', windowStart);

  // Count messages in current window
  const count = await redis.zcard(key);

  if (count >= 10) {
    return false; // Rate limit exceeded
  }

  // Add current message
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, 60);

  return true;
}

/**
 * Send Q&A Chat with rate limiting
 */
export async function sendQAChatWithRateLimit(request: QAChatRequest): Promise<QAChatResponse> {
  // Check chat-specific rate limit (10 messages/minute per user)
  const rateLimitOk = await checkChatRateLimit(request.userId);
  if (!rateLimitOk) {
    throw new Error(
      '메시지 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요. (최대 분당 10개 메시지)'
    );
  }

  return await sendQAChat(request);
}

export default {
  sendQAChat: sendQAChatWithRateLimit,
  startNewConversation,
  getConversationHistory,
  deleteConversation,
  getUserConversations,
};
