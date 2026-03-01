import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, CalendarDays, CheckSquare, MoreHorizontal,
  Scissors, BookOpen, MessageSquare, StickyNote, Settings,
  Bug, FlaskConical, Search, BarChart3, Sprout, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const primaryLinks = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/garden', label: 'Garden', icon: Map },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
];

const overflowLinks = [
  { to: '/harvests', label: 'Harvests', icon: Scissors },
  { to: '/catalog', label: 'Plant Catalog', icon: BookOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/seeds', label: 'Seed Inventory', icon: Sprout },
  { to: '/pest-events', label: 'Pest Tracker', icon: Bug },
  { to: '/soil-tests', label: 'Soil Tests', icon: FlaskConical },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/history', label: 'History', icon: History },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/assistant', label: 'Assistant', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const isOverflowActive = overflowLinks.some((l) => location.pathname.startsWith(l.to));

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="flex items-center justify-around h-16">
          {primaryLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 w-16 min-h-[48px] rounded-lg text-xs transition-colors',
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 w-16 min-h-[48px] rounded-lg text-xs transition-colors',
              isOverflowActive ? 'text-primary font-medium' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <nav className="grid grid-cols-3 gap-2 py-4">
            {overflowLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-xs transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  )
                }
              >
                <Icon className="w-6 h-6" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
