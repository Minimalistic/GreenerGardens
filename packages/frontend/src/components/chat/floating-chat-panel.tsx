import { useState, useRef, useEffect, useCallback } from 'react';
import { useAssistantContext } from '@/contexts/assistant-context';
import { useGardenContext } from '@/contexts/garden-context';
import {
  useAssistantStatus,
  useConversations,
  useConversationMessages,
  useCreateConversation,
  useDeleteConversation,
  useSendMessage,
} from '@/hooks/use-assistant';
import type { Message } from '@/hooks/use-assistant';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Loader2,
  X,
  ChevronDown,
  Sprout,
  GripVertical,
} from 'lucide-react';

export function FloatingChatPanel() {
  const {
    isOpen,
    close,
    activeConvId,
    setActiveConvId,
    sidebarWidth,
    setSidebarWidth,
    minSidebarWidth,
    maxSidebarWidth,
  } = useAssistantContext();
  const { garden } = useGardenContext();
  const gardenId = garden?.id ?? '';

  const { data: statusData } = useAssistantStatus();
  const configured = statusData?.data?.configured ?? false;

  const { data: convsData } = useConversations();
  const conversations = convsData?.data ?? [];

  const { data: messagesData } = useConversationMessages(activeConvId);
  const messages: Message[] = messagesData?.data ?? [];

  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();
  const { send, isStreaming, streamedContent } = useSendMessage();

  const [input, setInput] = useState('');
  const [showConvList, setShowConvList] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId, setActiveConvId]);

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

  // Scroll to bottom when stored messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Resize drag handler
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      setIsDragging(true);

      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        setSidebarWidth(startWidth + delta);
      };

      const onUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [sidebarWidth, setSidebarWidth],
  );

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || !gardenId || isStreaming) return;

    let convId = activeConvId;
    if (!convId) {
      const result = await createConv.mutateAsync(undefined);
      convId = result.data.id;
      setActiveConvId(convId);
    }

    setInput('');
    await send(convId, msg, gardenId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = async () => {
    const result = await createConv.mutateAsync(undefined);
    setActiveConvId(result.data.id);
    setShowConvList(false);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConv.mutateAsync(id);
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  };

  if (!isOpen) return null;

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Build display messages: stored messages + live streaming / pending refetch
  const displayMessages: Array<{ role: string; content: string; id?: string }> = [...messages];
  if (streamedContent) {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.content !== streamedContent) {
      displayMessages.push({ role: 'assistant', content: streamedContent });
    }
  }

  return (
    <div
      style={{ width: `${sidebarWidth}px` }}
      className="h-full flex flex-col bg-card border-l relative select-none"
    >
      {/* Resize drag handle */}
      <div
        onMouseDown={handleDragStart}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 flex items-center justify-center',
          'hover:bg-primary/10 active:bg-primary/20 transition-colors',
          isDragging && 'bg-primary/20',
        )}
      >
        <GripVertical className="w-3 h-3 text-muted-foreground/50" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-card shrink-0">
        <Sprout className="w-4 h-4 text-primary shrink-0" />
        <button
          onClick={() => setShowConvList(!showConvList)}
          className="flex items-center gap-1 min-w-0 flex-1 text-left"
        >
          <span className="text-sm font-medium truncate">
            {activeConv?.title ?? 'Garden Assistant'}
          </span>
          <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', showConvList && 'rotate-180')} />
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleNewConversation}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={close} title="Hide sidebar">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Conversation switcher */}
      {showConvList && (
        <div className="border-b max-h-48 overflow-y-auto bg-muted/30 shrink-0">
          <div className="p-1.5 space-y-0.5">
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No conversations yet</p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted',
                  activeConvId === conv.id && 'bg-muted',
                )}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setShowConvList(false);
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-xs">{conv.title ?? 'New conversation'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      {!configured ? (
        <div className="flex-1 min-h-0 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            AI Assistant not configured. Set the <code className="bg-muted px-1 py-0.5 rounded text-xs">ANTHROPIC_API_KEY</code> to enable.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-3 min-h-full flex flex-col justify-end">
            {displayMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Sprout className="w-8 h-8 text-primary" />
                <p className="text-sm text-muted-foreground text-center max-w-[280px]">
                  Ask me anything about your garden.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayMessages.map((msg, i) => (
                  <div
                    key={msg.id ?? `streaming-${i}`}
                    className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isStreaming && !streamedContent && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollDown && !isStreaming && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-opacity animate-in fade-in"
            aria-label="Scroll to latest message"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
        </div>
      )}

      {/* Input area */}
      {configured && (
        <div className="p-3 border-t shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your garden..."
              className="min-h-[40px] max-h-[80px] resize-none text-sm"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              size="icon"
              className="shrink-0 h-[40px] w-[40px]"
              disabled={!input.trim() || isStreaming}
              onClick={() => handleSend()}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
