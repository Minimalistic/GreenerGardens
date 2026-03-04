import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, FileText, Map, Bug, CheckSquare, Tag, Sprout } from 'lucide-react';
import { useSearch } from '@/hooks/use-search';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { plantTypeEmoji } from '@/lib/plant-type-emoji';

const entityIcons: Record<string, typeof SearchIcon> = {
  plant_catalog: Sprout,
  plot: Map,
  note: FileText,
  task: CheckSquare,
  pest_event: Bug,
  tag: Tag,
};

const entityRoutes: Record<string, (id: string) => string> = {
  plant_catalog: id => `/catalog/${id}`,
  plot: id => `/garden/plots/${id}`,
  task: () => '/tasks',
  pest_event: () => '/pest-events',
  note: () => '/notes',
  tag: () => '/settings',
};

export function SearchPage() {
  const [query, setQuery] = useState('');
  const { data, isLoading } = useSearch(query);
  const navigate = useNavigate();

  const results = data?.data ?? [];

  // Group by entity type
  const grouped = results.reduce((acc: Record<string, any[]>, r: any) => {
    (acc[r.entity_type] = acc[r.entity_type] || []).push(r);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold">Search</h2>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search plants, plots, notes, tasks..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Searching...</p>}

      {query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const Icon = entityIcons[type] || FileText;
        return (
          <div key={type}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 capitalize">{type.replace('_', ' ')}s</h3>
            <div className="space-y-2">
              {items.map((item: any) => (
                <Card
                  key={item.entity_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    const route = entityRoutes[type];
                    if (route) navigate(route(item.entity_id));
                  }}
                >
                  <CardContent className="py-3 flex items-center gap-3">
                    {item.entity_type === 'plant_catalog' ? (
                      <span className="text-lg plant-emoji">{item.emoji || plantTypeEmoji(item.plant_type)}</span>
                    ) : (
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
