import { Leaf } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="border-t bg-muted/30 py-6 px-4 mt-8">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Leaf className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground/70">GardenVault</span>
        </div>
        <p>Happy gardening!</p>
      </div>
    </footer>
  );
}
