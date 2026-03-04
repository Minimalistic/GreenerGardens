import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Manages auto-scroll behavior for chat message lists.
 * Handles: scroll-to-bottom button visibility, lerp chase during streaming,
 * and auto-scroll on new messages.
 */
export function useChatScroll(isStreaming: boolean) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef(0);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const root = scrollAreaRef.current;
    const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;

    const onScroll = () => {
      const distFromBottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
      setShowScrollDown(distFromBottom > 100);
    };

    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Smooth lerp-based scroll chase during streaming
  useEffect(() => {
    const root = scrollAreaRef.current;
    const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport || !isStreaming) return;

    const LERP = 0.12;
    const chase = () => {
      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      const dist = maxScroll - viewport.scrollTop;
      if (dist > 1) {
        viewport.scrollTop += dist * LERP;
      } else {
        viewport.scrollTop = maxScroll;
      }
      scrollRafRef.current = requestAnimationFrame(chase);
    };

    scrollRafRef.current = requestAnimationFrame(chase);
    return () => {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = 0;
      viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
    };
  }, [isStreaming]);

  return { messagesEndRef, scrollAreaRef, showScrollDown, scrollToBottom };
}
