import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGardenContext } from '@/contexts/garden-context';

interface HeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { garden } = useGardenContext();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center h-14 px-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        {garden && (
          <span className="text-sm text-muted-foreground hidden sm:block">
            {garden.name}
          </span>
        )}
      </div>
    </header>
  );
}
