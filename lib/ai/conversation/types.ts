/**
 * Conversation Types
 * TypeScript interfaces for Q&A chat conversations
 */

export interface ConversationMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokenCount: number;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string; // Auto-generated from first message
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  totalTokens: number;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  summary?: string; // Summary of old messages (if >10 messages)
  totalTokens: number;
}
