import { useState, useRef, useEffect } from 'react';
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
  AlertCircle,
  Sprout,
  Bug,
  CalendarDays,
  Droplets,
} from 'lucide-react';

const QUICK_PROMPTS = [
  { label: 'What should I do today?', icon: CalendarDays },
  { label: 'Any pest or disease concerns?', icon: Bug },
  { label: 'When should I water next?', icon: Droplets },
  { label: 'What can I plant right now?', icon: Sprout },
];

export function AssistantPage() {
  const { garden } = useGardenContext();
  const gardenId = garden?.id ?? '';

  const { data: statusData } = useAssistantStatus();
  const configured = statusData?.data?.configured ?? false;

  const { data: convsData } = useConversations();
  const conversations = convsData?.data ?? [];

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  const { data: messagesData } = useConversationMessages(activeConvId);
  const messages: Message[] = messagesData?.data ?? [];

  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();
  const { send, isStreaming, streamedContent } = useSendMessage();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedContent]);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || !gardenId || isStreaming) return;

    let convId = activeConvId;

    // Create conversation if none active
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
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConv.mutateAsync(id);
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  };

  if (!configured) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">AI Assistant Not Configured</h2>
          <p className="text-muted-foreground">
            Set the <code className="bg-muted px-1.5 py-0.5 rounded text-sm">ANTHROPIC_API_KEY</code> environment
            variable to enable the gardening assistant.
          </p>
        </div>
      </div>
    );
  }

  // Build display messages: stored messages + live streaming
  const displayMessages: Array<{ role: string; content: string; id?: string }> = [...messages];
  if (isStreaming && streamedContent) {
    displayMessages.push({ role: 'assistant', content: streamedContent });
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation sidebar */}
      {showSidebar && (
        <div className="hidden md:flex flex-col w-64 border rounded-lg bg-card">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Conversations</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewConversation}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-muted',
                    activeConvId === conv.id && 'bg-muted',
                  )}
                  onClick={() => setActiveConvId(conv.id)}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{conv.title ?? 'New conversation'}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card">
        {/* Mobile toggle */}
        <div className="md:hidden p-2 border-b flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
            <MessageSquare className="w-4 h-4 mr-1" />
            Chats
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNewConversation}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
              <div className="text-center space-y-2">
                <Sprout className="w-10 h-10 text-primary mx-auto" />
                <h3 className="text-lg font-medium">Garden Assistant</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Ask me anything about your garden — planting schedules, pest management, harvest timing, and more.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                  <Button
                    key={label}
                    variant="outline"
                    className="h-auto py-3 px-4 text-left justify-start gap-2"
                    onClick={() => handleSend(label)}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {displayMessages.map((msg, i) => (
                <div
                  key={msg.id ?? `streaming-${i}`}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-4 py-3 text-sm',
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
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your garden..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
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
      </div>
    </div>
  );
}
