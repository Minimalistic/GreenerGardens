import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  href?: string;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, href, className }: StatCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className={cn(href && 'cursor-pointer hover:bg-muted/50 transition-colors', className)}
      onClick={href ? () => navigate(href) : undefined}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
