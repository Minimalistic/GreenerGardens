import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/toaster';

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
  '/assistant': 'Garden Assistant',
  '/settings': 'Settings',
};

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] ?? 'GardenVault';

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-60 p-4">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col">
        <Header title={title} onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 pb-20 lg:pb-4">
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <Toaster />
    </div>
  );
}
