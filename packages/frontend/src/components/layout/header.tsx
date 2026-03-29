import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Wrench, Bug, Settings, Home } from 'lucide-react';
import { UndoRedoControls } from '@/components/undo-redo-controls';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';
import { SettingsDialog } from '@/components/settings-dialog';
import { FeedbackDialog } from '@/components/feedback/feedback-dialog';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'dashboard') {
      localStorage.setItem('glenwood-dashboard', '1');
      params.delete('from');
      const clean = window.location.pathname + (params.toString() ? '?' + params : '') + window.location.hash;
      history.replaceState(null, '', clean);
    }
    if (localStorage.getItem('glenwood-dashboard')) setShowDashboard(true);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center h-14 px-4 gap-4">
          {showDashboard && (
            <a
              href="http://100.71.235.97:3001"
              className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Back to Dashboard"
            >
              <Home className="w-4 h-4" />
            </a>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <UndoRedoControls />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Wrench className="w-4 h-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
                <Bug className="w-4 h-4 mr-2" />
                Send Feedback
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="w-4 h-4 mr-2" />
                Light
                {theme === 'light' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="w-4 h-4 mr-2" />
                Dark
                {theme === 'dark' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="w-4 h-4 mr-2" />
                System
                {theme === 'system' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
