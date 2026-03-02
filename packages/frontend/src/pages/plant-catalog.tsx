import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import { PlantFormDialog } from '@/components/plant-form-dialog';
import { DataTable, type Column } from '@/components/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { PlantTypeBadge } from '@/components/garden/plant-type-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, LayoutGrid, TableIcon, Plus } from 'lucide-react';
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
  const [view, setView] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('catalog-view') as 'card' | 'table') ?? 'card'
  );
  const [addOpen, setAddOpen] = useState(false);

  const limit = view === 'table' ? 200 : 24;

  const { data, isLoading } = usePlantCatalogSearch({
    search: search || undefined,
    plant_type: plantType || undefined,
    page: view === 'table' ? 1 : page,
    limit,
  });

  const plants = data?.data ?? [];
  const pagination = data?.pagination;

  const toggleView = (v: 'card' | 'table') => {
    setView(v);
    localStorage.setItem('catalog-view', v);
    setPage(1);
  };

  const catalogColumns: Column<any>[] = [
    {
      key: 'image_url',
      label: '',
      sortable: false,
      render: (row) => (
        <div className="w-8 h-8 shrink-0 overflow-hidden rounded">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt={row.common_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>
      ),
    },
    {
      key: 'common_name',
      label: 'Name',
      render: (row) => (
        <button
          className="text-left font-medium hover:underline"
          onClick={() => navigate(`/catalog/${row.id}`)}
        >
          {row.emoji && <span className="mr-1 grayscale">{row.emoji}</span>}
          {row.common_name}
        </button>
      ),
    },
    { key: 'scientific_name', label: 'Scientific Name', render: (row) => (
      <span className="italic text-muted-foreground">{row.scientific_name ?? '-'}</span>
    )},
    { key: 'plant_type', label: 'Type', render: (row) => (
      <PlantTypeBadge
        plantType={row.plant_type}
        onClick={() => { setPlantType(row.plant_type); setPage(1); }}
      />
    )},
    { key: 'sun_exposure', label: 'Sun', render: (row) => (
      <span className="capitalize">{row.sun_exposure?.replace(/_/g, ' ') ?? '-'}</span>
    )},
    { key: 'days_to_maturity_min', label: 'Days to Maturity', render: (row) =>
      row.days_to_maturity_min
        ? `${row.days_to_maturity_min}${row.days_to_maturity_max ? `-${row.days_to_maturity_max}` : ''}`
        : '-',
      getValue: (row) => row.days_to_maturity_min ?? 999,
    },
    { key: 'spacing_inches', label: 'Spacing (in)', render: (row) => row.spacing_inches ?? '-' },
    { key: 'water_needs', label: 'Water', render: (row) => (
      <span className="capitalize">{row.water_needs?.replace(/_/g, ' ') ?? '-'}</span>
    )},
  ];

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
        <div className="flex gap-1">
          <Button variant={view === 'card' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('card')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('table')}>
            <TableIcon className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Plant
        </Button>
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
          No plants found. Try adjusting your search or add a custom plant.
        </p>
      )}

      {!isLoading && plants.length > 0 && view === 'table' && (
        <DataTable
          data={plants}
          columns={catalogColumns}
          searchable={false}
          exportFilename="plant-catalog"
        />
      )}

      {!isLoading && plants.length > 0 && view === 'card' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plants.map((plant: any) => (
              <Card
                key={plant.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden relative"
                onClick={() => navigate(`/catalog/${plant.id}`)}
              >
                {plant.image_url && (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={plant.image_url}
                      alt={plant.common_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4 space-y-2 relative">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm">
                      {plant.emoji && <span className="mr-1 grayscale">{plant.emoji}</span>}
                      {plant.common_name}
                    </h3>
                    <PlantTypeBadge
                      plantType={plant.plant_type}
                      className="text-xs shrink-0 ml-2"
                      onClick={(e) => { e.stopPropagation(); setPlantType(plant.plant_type); setPage(1); }}
                    />
                  </div>
                  {plant.scientific_name && (
                    <p className="text-xs text-muted-foreground italic">{plant.scientific_name}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {plant.sun_exposure && (
                      <span title={plant.sun_exposure}>
                        {SUN_ICONS[plant.sun_exposure] ?? ''} {plant.sun_exposure.replace(/_/g, ' ')}
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
        </>
      )}

      <PlantFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
