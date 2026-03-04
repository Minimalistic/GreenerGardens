import { useEffect, type RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Loader2, ChevronDown } from 'lucide-react';
import type { Message } from '@/hooks/use-assistant';

interface DisplayMessage {
  role: string;
  content: string;
  id?: string;
}

export function buildDisplayMessages(
  messages: Message[],
  streamedContent: string | null,
): DisplayMessage[] {
  const display: DisplayMessage[] = [...messages];
  if (streamedContent) {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.content !== streamedContent) {
      display.push({ role: 'assistant', content: streamedContent });
    }
  }
  return display;
}

interface ChatMessageListProps {
  messages: DisplayMessage[];
  isStreaming: boolean;
  streamedContent: string | null;
  scrollAreaRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
  showScrollDown: boolean;
  scrollToBottom: () => void;
  /** Extra className for ScrollArea */
  className?: string;
  /** Wrap content in a flex-end container (for floating panel) */
  flexEnd?: boolean;
  /** Empty state to show when no messages */
  emptyState?: React.ReactNode;
}

export function ChatMessageList({
  messages,
  isStreaming,
  streamedContent,
  scrollAreaRef,
  messagesEndRef,
  showScrollDown,
  scrollToBottom,
  className,
  flexEnd,
  emptyState,
}: ChatMessageListProps) {
  // Scroll to bottom when stored messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  return (
    <div className="flex-1 relative min-h-0">
      <ScrollArea ref={scrollAreaRef} className={cn('h-full', className)}>
        <div className={cn(flexEnd && 'min-h-full flex flex-col justify-end')}>
          {messages.length === 0 ? (
            emptyState
          ) : (
            <div className={cn('space-y-3', !flexEnd && 'space-y-4 max-w-3xl mx-auto')}>
              {messages.map((msg, i) => (
                <div
                  key={msg.id ?? `streaming-${i}`}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg text-sm',
                      flexEnd ? 'px-3 py-2' : 'px-4 py-3',
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
                  <div className={cn('bg-muted rounded-lg', flexEnd ? 'px-3 py-2' : 'px-4 py-3')}>
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {showScrollDown && !isStreaming && (
        <button
          onClick={scrollToBottom}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-opacity animate-in fade-in',
            flexEnd ? 'bottom-2 p-1.5' : 'bottom-4 p-2',
          )}
          aria-label="Scroll to latest message"
        >
          <ChevronDown className={cn(flexEnd ? 'w-4 h-4' : 'w-5 h-5')} />
        </button>
      )}
    </div>
  );
}
