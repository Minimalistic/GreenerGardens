import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ApiResponse } from '@gardenvault/shared';

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  context_summary: string | null;
  created_at: string;
}

export function useAssistantStatus() {
  return useQuery({
    queryKey: queryKeys.assistant.status,
    queryFn: () => api.get<ApiResponse<{ configured: boolean }>>('/assistant/status'),
    staleTime: 60_000,
  });
}

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.assistant.conversations,
    queryFn: () => api.get<ApiResponse<Conversation[]>>('/assistant/conversations'),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.assistant.messages(conversationId!),
    queryFn: () => api.get<ApiResponse<Message[]>>(`/assistant/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) =>
      api.post<ApiResponse<Conversation>>('/assistant/conversations', { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assistant.conversations });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/assistant/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assistant.conversations });
    },
  });
}

// Gentle text reveal: characters per frame bounds and easing factor
const REVEAL_MIN_CHARS = 1;
const REVEAL_MAX_CHARS = 5;
const REVEAL_EASE = 0.04;

export function useSendMessage() {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef('');
  const displayedLenRef = useRef(0);
  const rafRef = useRef(0);

  // Animate text reveal: gradually show buffered text at a gentle pace
  const tick = useCallback(() => {
    const bufLen = bufferRef.current.length;
    const curLen = displayedLenRef.current;

    if (curLen < bufLen) {
      const remaining = bufLen - curLen;
      const step = Math.min(
        REVEAL_MAX_CHARS,
        Math.max(REVEAL_MIN_CHARS, Math.ceil(remaining * REVEAL_EASE)),
      );
      const nextLen = Math.min(bufLen, curLen + step);
      displayedLenRef.current = nextLen;
      setStreamedContent(bufferRef.current.slice(0, nextLen));
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = 0;
    }
  }, []);

  const scheduleReveal = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const send = useCallback(
    async (conversationId: string, message: string, gardenId: string) => {
      setIsStreaming(true);
      setStreamedContent('');
      bufferRef.current = '';
      displayedLenRef.current = 0;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/v1/assistant/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, garden_id: gardenId }),
            signal: controller.signal,
          },
        );

        if (!res.ok || !res.body) {
          throw new Error('Failed to send message');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.error) throw new Error(payload.error);
              if (payload.done) break;
              if (payload.text) {
                bufferRef.current += payload.text;
                scheduleReveal();
              }
            } catch (e: any) {
              if (e.message && e.message !== 'Unexpected end of JSON input') {
                throw e;
              }
            }
          }
        }

        // Wait for reveal animation to finish before completing
        await new Promise<void>((resolve) => {
          const check = () => {
            if (displayedLenRef.current >= bufferRef.current.length) {
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          check();
        });
      } finally {
        // Flush any remaining buffered content
        if (bufferRef.current) {
          setStreamedContent(bufferRef.current);
          displayedLenRef.current = bufferRef.current.length;
        }
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
        setIsStreaming(false);
        abortRef.current = null;
        // Await refetch so streamedContent stays visible until stored messages arrive
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.assistant.messages(conversationId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.assistant.conversations }),
        ]);
        setStreamedContent('');
      }
    },
    [queryClient, scheduleReveal],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, abort, isStreaming, streamedContent };
}

export type { Conversation, Message };
