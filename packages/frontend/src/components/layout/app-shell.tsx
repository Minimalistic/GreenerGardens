import { createPortal } from 'react-dom';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
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
  '/weather': 'Weather',
  '/settings': 'Settings',
};

export function AppShell() {
  const location = useLocation();
  const { isOpen, sidebarWidth, close } = useAssistantContext();

  const title = PAGE_TITLES[location.pathname] ?? 'GardenVault';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <Header title={title} />
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

      {/* Mobile chat overlay — portalled to body so overflow:hidden can't clip it */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden" onClick={close}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="absolute inset-x-2 top-2 bottom-16 rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <FloatingChatPanel />
            </div>
          </div>,
          document.body,
        )}

      <FloatingChatButton />
      <MobileNav />
      <Toaster />
    </div>
  );
}
