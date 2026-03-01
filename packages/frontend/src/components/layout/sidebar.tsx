import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, BookOpen, Scissors, CheckSquare, CalendarDays, MessageSquare, Settings, Bug, FlaskConical, StickyNote, Search, BarChart3, Sprout, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/garden', label: 'My Garden', icon: Map },
  { to: '/catalog', label: 'Plant Catalog', icon: BookOpen },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/harvests', label: 'Harvests', icon: Scissors },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/pest-events', label: 'Pest Tracker', icon: Bug },
  { to: '/soil-tests', label: 'Soil Tests', icon: FlaskConical },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/history', label: 'History', icon: History },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/seeds', label: 'Seed Inventory', icon: Sprout },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/assistant', label: 'Assistant', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void } = {}) {
  return (
    <aside className={cn(mobile ? 'flex flex-col' : 'hidden lg:flex flex-col w-60 border-r bg-card min-h-screen p-4')}>
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg garden-gradient flex items-center justify-center">
          <span className="text-white font-bold text-sm">GV</span>
        </div>
        <span className="font-semibold text-lg text-foreground">GardenVault</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
