import { useAssistantContext } from '@/contexts/assistant-context';
import { Button } from '@/components/ui/button';
import { Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingChatButton() {
  const { isOpen, toggle, activeConvId } = useAssistantContext();

  if (isOpen) return null;

  return (
    <Button
      onClick={toggle}
      size="icon"
      className={cn(
        'fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg',
        'lg:bottom-5 bottom-20',
        !activeConvId && 'animate-pulse',
      )}
    >
      <Sprout className="w-5 h-5" />
    </Button>
  );
}
