import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
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
    queryKey: ['assistant', 'status'],
    queryFn: () => api.get<ApiResponse<{ configured: boolean }>>('/assistant/status'),
    staleTime: 60_000,
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ['assistant', 'conversations'],
    queryFn: () => api.get<ApiResponse<Conversation[]>>('/assistant/conversations'),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['assistant', 'messages', conversationId],
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
      queryClient.invalidateQueries({ queryKey: ['assistant', 'conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/assistant/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant', 'conversations'] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (conversationId: string, message: string, gardenId: string) => {
    setIsStreaming(true);
    setStreamedContent('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/v1/assistant/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, garden_id: gardenId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to send message');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.error) throw new Error(payload.error);
            if (payload.done) break;
            if (payload.text) {
              accumulated += payload.text;
              setStreamedContent(accumulated);
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      // Refresh messages and conversations after streaming completes
      queryClient.invalidateQueries({ queryKey: ['assistant', 'messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['assistant', 'conversations'] });
    }
  }, [queryClient]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, abort, isStreaming, streamedContent };
}

export type { Conversation, Message };
