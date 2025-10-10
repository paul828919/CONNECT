/**
 * Conversation Context Manager
 * Manages conversation history with Redis persistence and token limits
 *
 * Week 3-4: AI Integration (Day 18-19)
 *
 * Features:
 * - Redis-based conversation storage
 * - Token-aware message truncation
 * - Last 10 messages context window
 * - Conversation summary for old messages
 * - Company profile context injection
 */

import { Redis } from 'ioredis';
import { ConversationMessage, ConversationContext, Conversation } from './types';

// Lazy Redis initialization
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_CACHE_URL || 'redis://localhost:6379/0');
  }
  return redis;
}

export interface ContextManagerConfig {
  maxMessages: number;       // Default: 10 (last 10 messages)
  maxTokens: number;         // Default: 8000 (reserve for context)
  summarizationThreshold: number; // Default: 20 (summarize if >20 total messages)
}

/**
 * Conversation Context Manager
 * Handles multi-turn conversation state and context window management
 */
export class ConversationContextManager {
  private config: ContextManagerConfig;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    this.config = {
      maxMessages: config.maxMessages || 10,
      maxTokens: config.maxTokens || 8000,
      summarizationThreshold: config.summarizationThreshold || 20,
    };
  }

  /**
   * Get conversation context for AI request
   * Returns recent messages + summary of old messages (if applicable)
   */
  async getContext(conversationId: string): Promise<ConversationContext> {
    const redis = getRedisClient();

    // Fetch all messages for this conversation
    const messageKeys = await redis.lrange(`conversation:${conversationId}:messages`, 0, -1);
    const messages: ConversationMessage[] = [];

    for (const key of messageKeys) {
      const msgData = await redis.get(key);
      if (msgData) {
        messages.push(JSON.parse(msgData));
      }
    }

    // Sort by timestamp (oldest first)
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate total tokens
    const totalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    // If messages exceed max, use recent + summary
    if (messages.length > this.config.maxMessages) {
      const recentMessages = messages.slice(-this.config.maxMessages);
      const oldMessages = messages.slice(0, -this.config.maxMessages);
      const summary = this.summarizeMessages(oldMessages);

      return {
        messages: recentMessages,
        summary,
        totalTokens,
      };
    }

    // Otherwise return all messages
    return {
      messages,
      summary: undefined,
      totalTokens,
    };
  }

  /**
   * Add a new message to conversation
   */
  async addMessage(
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    tokenCount: number
  ): Promise<ConversationMessage> {
    const redis = getRedisClient();

    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      conversationId,
      userId,
      role,
      content,
      timestamp: new Date(),
      tokenCount,
    };

    // Store message in Redis
    const messageKey = `message:${message.id}`;
    await redis.set(messageKey, JSON.stringify(message), 'EX', 86400 * 7); // Expire after 7 days

    // Add message to conversation's message list
    await redis.rpush(`conversation:${conversationId}:messages`, messageKey);
    await redis.expire(`conversation:${conversationId}:messages`, 86400 * 7);

    // Update conversation metadata
    await this.updateConversationMetadata(conversationId, userId);

    return message;
  }

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title?: string): Promise<Conversation> {
    const redis = getRedisClient();

    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId,
      title: title || '새 대화',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      totalTokens: 0,
    };

    // Store conversation in Redis
    const convKey = `conversation:${conversation.id}`;
    await redis.set(convKey, JSON.stringify(conversation), 'EX', 86400 * 7); // Expire after 7 days

    // Add to user's conversation list
    await redis.rpush(`user:${userId}:conversations`, conversation.id);
    await redis.expire(`user:${userId}:conversations`, 86400 * 7);

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const redis = getRedisClient();
    const convKey = `conversation:${conversationId}`;
    const data = await redis.get(convKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as Conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const redis = getRedisClient();
    const conversationIds = await redis.lrange(`user:${userId}:conversations`, 0, -1);

    const conversations: Conversation[] = [];
    for (const id of conversationIds) {
      const conv = await this.getConversation(id);
      if (conv) {
        conversations.push(conv);
      }
    }

    // Sort by updatedAt (most recent first)
    conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return conversations;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const redis = getRedisClient();

    // Delete all messages
    const messageKeys = await redis.lrange(`conversation:${conversationId}:messages`, 0, -1);
    for (const key of messageKeys) {
      await redis.del(key);
    }

    // Delete message list
    await redis.del(`conversation:${conversationId}:messages`);

    // Delete conversation
    await redis.del(`conversation:${conversationId}`);

    // Remove from user's conversation list
    await redis.lrem(`user:${userId}:conversations`, 0, conversationId);
  }

  /**
   * Auto-generate conversation title from first user message
   */
  generateConversationTitle(firstMessage: string): string {
    // Take first 40 characters
    let title = firstMessage.substring(0, 40);

    // If truncated, add ellipsis
    if (firstMessage.length > 40) {
      title += '...';
    }

    return title;
  }

  /**
   * Update conversation metadata (message count, tokens, updated time)
   */
  private async updateConversationMetadata(conversationId: string, userId: string): Promise<void> {
    const redis = getRedisClient();

    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      return;
    }

    // Count messages
    const messageKeys = await redis.lrange(`conversation:${conversationId}:messages`, 0, -1);
    const messageCount = messageKeys.length;

    // Calculate total tokens
    let totalTokens = 0;
    for (const key of messageKeys) {
      const msgData = await redis.get(key);
      if (msgData) {
        const msg = JSON.parse(msgData) as ConversationMessage;
        totalTokens += msg.tokenCount;
      }
    }

    // Update conversation
    conversation.messageCount = messageCount;
    conversation.totalTokens = totalTokens;
    conversation.updatedAt = new Date();

    // If this is the first message, update title
    if (messageCount === 1) {
      const firstMsgKey = messageKeys[0];
      const firstMsgData = await redis.get(firstMsgKey);
      if (firstMsgData) {
        const firstMsg = JSON.parse(firstMsgData) as ConversationMessage;
        if (firstMsg.role === 'user') {
          conversation.title = this.generateConversationTitle(firstMsg.content);
        }
      }
    }

    // Save updated conversation
    await redis.set(`conversation:${conversationId}`, JSON.stringify(conversation), 'EX', 86400 * 7);
  }

  /**
   * Summarize old messages (basic text concatenation)
   * In future: Could use AI to generate intelligent summaries
   */
  private summarizeMessages(messages: ConversationMessage[]): string {
    const userQuestions = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .slice(0, 3) // Take first 3 questions
      .join(', ');

    const summary = `이전 대화 요약: 사용자가 다음 질문들을 했습니다 - ${userQuestions}`;

    // Truncate if too long
    return summary.substring(0, 200);
  }

  /**
   * Estimate token count (rough approximation)
   * Korean: ~1.5 tokens per character
   * English: ~0.25 tokens per word
   */
  estimateTokenCount(text: string): number {
    // Simple heuristic: count characters
    // Korean/Chinese characters: ~1.5 tokens each
    // English words: ~0.25 tokens per word

    const koreanRegex = /[\u3131-\uD79D]/g;
    const koreanChars = (text.match(koreanRegex) || []).length;

    const englishWords = text.split(/\s+/).length;

    return Math.ceil(koreanChars * 1.5 + englishWords * 0.25);
  }

  /**
   * Clean up old conversations (utility for maintenance)
   */
  async cleanupOldConversations(userId: string, keepRecent: number = 50): Promise<number> {
    const conversations = await this.getUserConversations(userId);

    // Keep only recent conversations
    const toDelete = conversations.slice(keepRecent);

    for (const conv of toDelete) {
      await this.deleteConversation(conv.id, userId);
    }

    return toDelete.length;
  }
}

// Export singleton instance
export const conversationManager = new ConversationContextManager();

export default ConversationContextManager;
