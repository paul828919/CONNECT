'use client';

/**
 * Q&A Chat Component
 * Interactive chat interface for grant-related questions
 *
 * Week 3-4: AI Integration (Day 18-19)
 *
 * Features:
 * - Message bubbles (user/assistant)
 * - Auto-scroll to latest message
 * - Loading states with typing indicator
 * - Error handling with retry
 * - Conversation sidebar (future)
 * - Input with send button
 * - Cost and metadata display
 */

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Loader2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Clock,
  Coins,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cost?: number;
  responseTime?: number;
}

export interface QAChatProps {
  conversationId?: string; // If provided, continue conversation; otherwise start new
  autoFocus?: boolean;
  onNewConversation?: (conversationId: string) => void;
}

export function QAChat({ conversationId: initialConversationId, autoFocus = true, onNewConversation }: QAChatProps) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversationId,
          message: userMessage,
          newConversation: !conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'AI 응답 생성에 실패했습니다.');
      }

      // Update conversation ID if this was a new conversation
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        onNewConversation?.(data.conversationId);
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: data.messageId,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        cost: data.cost,
        responseTime: data.responseTime,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update total cost
      if (data.cost) {
        setTotalCost((prev) => prev + data.cost);
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="flex flex-col h-full max-h-[700px]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              정부 R&D 과제 Q&A
            </CardTitle>
            <CardDescription>
              TRL, 인증, 신청 절차 등 궁금한 점을 물어보세요
            </CardDescription>
          </div>
          {totalCost > 0 && (
            <Badge variant="outline" className="gap-1">
              <Coins className="h-3 w-3" />
              ₩{totalCost.toFixed(2)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
              <div className="rounded-full bg-primary/10 p-4">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">AI 어시스턴트에게 물어보세요</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  TRL 단계, ISMS-P 인증, 과제 신청 방법 등<br />
                  정부 R&D 과제에 대한 모든 질문에 답변드립니다
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground max-w-md">
                <div className="text-left p-2 rounded bg-muted/50">
                  💡 예: "TRL 7에서 TRL 8로 올리려면 무엇이 필요한가요?"
                </div>
                <div className="text-left p-2 rounded bg-muted/50">
                  💡 예: "ISMS-P 인증은 어떻게 준비하나요?"
                </div>
                <div className="text-left p-2 rounded bg-muted/50">
                  💡 예: "IITP와 KEIT의 차이점은 무엇인가요?"
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {/* Message content */}
                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.responseTime && (
                    <>
                      <span>•</span>
                      <Clock className="h-3 w-3 inline" />
                      <span>{(message.responseTime / 1000).toFixed(1)}s</span>
                    </>
                  )}
                  {message.cost && (
                    <>
                      <span>•</span>
                      <Coins className="h-3 w-3 inline" />
                      <span>₩{message.cost.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">AI가 답변을 생성하고 있습니다...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
              className="min-h-[80px] max-h-[200px] resize-none"
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !inputValue.trim()}
              size="lg"
              className="px-4"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            AI가 생성한 답변입니다. 최종 신청 전 반드시 공고문을 직접 확인하세요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default QAChat;
