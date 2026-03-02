import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/toaster';
import { useAssistantContext } from '@/contexts/assistant-context';
import { FloatingChatButton } from '@/components/chat/floating-chat-button';
import { FloatingChatPanel } from '@/components/chat/floating-chat-panel';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/garden': 'My Garden',
  '/catalog': 'Plant Catalog',
  '/calendar': 'Calendar',
  '/harvests': 'Harvest Log',
  '/tasks': 'Tasks',
  '/pest-events': 'Pest Tracker',
  '/soil-tests': 'Soil Tests',
  '/notes': 'Garden Notes',
  '/search': 'Search',
  '/analytics': 'Analytics',
  '/seeds': 'Seed Inventory',
  '/assistant': 'Garden Assistant',
  '/settings': 'Settings',
};

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isOpen, sidebarWidth } = useAssistantContext();

  const title = PAGE_TITLES[location.pathname] ?? 'GardenVault';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-60 p-4">
          <Sidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <Header title={title} onMenuToggle={() => setMobileMenuOpen(true)} />
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-w-0 overflow-y-auto p-4 pb-20 lg:pb-4">
            <Outlet />
          </main>
          {/* AI Chat Sidebar — animated width container */}
          <div
            className="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out hidden md:block"
            style={{ width: isOpen ? `${sidebarWidth}px` : '0px' }}
          >
            <FloatingChatPanel />
          </div>
        </div>
      </div>

      <FloatingChatButton />
      <MobileNav />
      <Toaster />
    </div>
  );
}
