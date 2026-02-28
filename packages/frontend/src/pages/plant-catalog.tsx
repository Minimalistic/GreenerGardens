import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Sun, Droplets } from 'lucide-react';
const TYPE_FILTERS = [
  { value: '', label: 'All Types' },
  { value: 'vegetable', label: 'Vegetables' },
  { value: 'herb', label: 'Herbs' },
  { value: 'fruit', label: 'Fruits' },
  { value: 'flower', label: 'Flowers' },
];

const SUN_ICONS: Record<string, string> = {
  full_sun: '☀️',
  partial_sun: '🌤️',
  partial_shade: '⛅',
  full_shade: '🌥️',
};

export function PlantCatalogPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [plantType, setPlantType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePlantCatalogSearch({
    search: search || undefined,
    plant_type: plantType || undefined,
    page,
    limit: 24,
  });

  const plants = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search plants..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={plantType} onValueChange={v => { setPlantType(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value || ' '}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && plants.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No plants found. Try adjusting your search.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plants.map((plant: any) => (
          <Card
            key={plant.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/catalog/${plant.id}`)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm">{plant.common_name}</h3>
                <Badge variant="outline" className="text-xs capitalize shrink-0 ml-2">
                  {plant.plant_type}
                </Badge>
              </div>
              {plant.scientific_name && (
                <p className="text-xs text-muted-foreground italic">{plant.scientific_name}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {plant.sun_exposure && (
                  <span title={plant.sun_exposure}>
                    {SUN_ICONS[plant.sun_exposure] ?? '☀️'} {plant.sun_exposure.replace('_', ' ')}
                  </span>
                )}
                {plant.days_to_maturity_min && (
                  <span>
                    {plant.days_to_maturity_min}
                    {plant.days_to_maturity_max ? `-${plant.days_to_maturity_max}` : ''} days
                  </span>
                )}
              </div>
              {plant.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{plant.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground flex items-center">
            Page {page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
