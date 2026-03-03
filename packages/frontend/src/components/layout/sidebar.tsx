import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, BookOpen, Scissors, CheckSquare, CalendarDays, MessageSquare, Settings, Bug, FlaskConical, StickyNote, Search, BarChart3, Sprout, History, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STORAGE_KEY = 'gardenvault_sidebar_collapsed';

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    title: 'Core',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/garden', label: 'My Garden', icon: Map },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    ],
  },
  {
    title: 'Plants',
    items: [
      { to: '/catalog', label: 'Plant Catalog', icon: BookOpen },
      { to: '/seeds', label: 'Seed Inventory', icon: Sprout },
      { to: '/harvests', label: 'Harvests', icon: Scissors },
    ],
  },
  {
    title: 'Tracking',
    items: [
      { to: '/pest-events', label: 'Pest Tracker', icon: Bug },
      { to: '/soil-tests', label: 'Soil Tests', icon: FlaskConical },
      { to: '/notes', label: 'Notes', icon: StickyNote },
      { to: '/history', label: 'History', icon: History },
    ],
  },
  {
    title: 'Insights',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/search', label: 'Search', icon: Search },
    ],
  },
  {
    title: 'Tools',
    items: [
      { to: '/assistant', label: 'Assistant', icon: MessageSquare },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void } = {}) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  // Mobile sidebar is always expanded (shown in a Sheet drawer)
  const isCollapsed = !mobile && collapsed;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          mobile
            ? 'flex flex-col'
            : 'hidden lg:flex flex-col border-r bg-card min-h-screen p-4 transition-[width] duration-200 ease-in-out',
          !mobile && (isCollapsed ? 'w-[4.5rem]' : 'w-60'),
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center mb-6', isCollapsed ? 'justify-center px-0' : 'gap-2 px-2')}>
          <div className="w-8 h-8 rounded-lg garden-gradient flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">GV</span>
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-lg text-foreground whitespace-nowrap overflow-hidden">
              GardenVault
            </span>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex flex-col flex-1 overflow-y-auto">
          {sections.map((section, sectionIdx) => (
            <div key={section.title} className={cn(sectionIdx > 0 && 'mt-4')}>
              {/* Section header — skip for first section */}
              {sectionIdx > 0 && (
                isCollapsed ? (
                  <div className="mx-auto my-1 w-6 border-t border-muted-foreground/25" />
                ) : (
                  <span className="px-3 mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {section.title}
                  </span>
                )
              )}

              {/* Section items */}
              <div className="flex flex-col gap-0.5">
                {section.items.map(({ to, label, icon: Icon }) => {
                  const link = (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center rounded-lg text-sm font-medium transition-colors',
                          isCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      <Icon className="w-8 h-8 shrink-0" />
                      {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
                    </NavLink>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={to}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return link;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle — desktop only */}
        {!mobile && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              'flex items-center rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mt-2',
              isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5',
            )}
          >
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <PanelLeftOpen className="w-8 h-8 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <PanelLeftClose className="w-8 h-8 shrink-0" />
                <span className="whitespace-nowrap overflow-hidden">Collapse</span>
              </>
            )}
          </button>
        )}
      </aside>
    </TooltipProvider>
  );
}
