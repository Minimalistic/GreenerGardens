import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, BookOpen, Scissors, CheckSquare, CalendarDays, MessageSquare, Settings, Bug, FlaskConical, StickyNote, Search, BarChart3, Sprout, History, PanelLeftClose, PanelLeftOpen, CloudSun, ShieldAlert } from 'lucide-react';
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
      { to: '/pests', label: 'Pest Guide', icon: ShieldAlert },
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
      { to: '/weather', label: 'Weather', icon: CloudSun },
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
            : 'hidden lg:flex flex-col border-r bg-card min-h-screen p-2 transition-[width] duration-200 ease-in-out',
          !mobile && (isCollapsed ? 'w-12' : 'w-40'),
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center mb-4', isCollapsed ? 'justify-center px-0' : 'gap-1.5 px-1')}>
          <div className="w-5 h-5 rounded garden-gradient flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-[9px]">GV</span>
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-xs text-foreground whitespace-nowrap overflow-hidden">
              GardenVault
            </span>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex flex-col flex-1 overflow-y-auto">
          {sections.map((section, sectionIdx) => (
            <div key={section.title} className={cn(sectionIdx > 0 && 'mt-2')}>
              {/* Section header — skip for first section */}
              {sectionIdx > 0 && (
                isCollapsed ? (
                  <div className="mx-auto my-0.5 w-4 border-t border-muted-foreground/25" />
                ) : (
                  <span className="px-2 mb-0.5 block text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
                          'flex items-center rounded text-xs font-medium transition-colors',
                          isCollapsed ? 'justify-center px-0 py-1' : 'gap-2 px-2 py-1',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
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
              'flex items-center rounded text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mt-2',
              isCollapsed ? 'justify-center py-1' : 'gap-2 px-2 py-1',
            )}
          >
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <PanelLeftOpen className="w-4 h-4 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap overflow-hidden">Collapse</span>
              </>
            )}
          </button>
        )}
      </aside>
    </TooltipProvider>
  );
}
