import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, BookOpen, CheckSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/garden', label: 'Garden', icon: Map },
  { to: '/catalog', label: 'Catalog', icon: BookOpen },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex items-center justify-around h-16">
        {links.map(({ to, label, icon: Icon }) => (
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
      </div>
    </nav>
  );
}
