import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePestCatalogSearch } from '@/hooks/use-pest-catalog';
import { DataTable, type Column } from '@/components/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { ViewToggleButtons } from '@/components/ui/view-toggle-buttons';
import { SEVERITY_COLORS, CATEGORY_COLORS } from '@/lib/pest-colors';
import { useViewToggle } from '@/hooks/use-view-toggle';

const CATEGORY_FILTERS = [
  { value: '', label: 'All Categories' },
  { value: 'insect', label: 'Insects' },
  { value: 'mite', label: 'Mites' },
  { value: 'fungal', label: 'Fungal' },
  { value: 'bacterial', label: 'Bacterial' },
  { value: 'viral', label: 'Viral' },
  { value: 'nematode', label: 'Nematodes' },
  { value: 'mollusk', label: 'Mollusks' },
  { value: 'mammal', label: 'Mammals' },
  { value: 'nutritional', label: 'Nutritional' },
  { value: 'environmental', label: 'Environmental' },
];

const SEVERITY_FILTERS = [
  { value: '', label: 'All Severity' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function PestCatalogPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [view, baseToggleView] = useViewToggle<'card' | 'table'>('pest-catalog-view', 'card');
  const toggleView = (v: 'card' | 'table') => { baseToggleView(v); setPage(1); };

  const limit = view === 'table' ? 200 : 24;

  const { data, isLoading } = usePestCatalogSearch({
    search: search || undefined,
    category: category || undefined,
    severity: severity || undefined,
    page: view === 'table' ? 1 : page,
    limit,
  });

  const pests = data?.data ?? [];
  const pagination = data?.pagination;

  const tableColumns: Column<any>[] = [
    {
      key: 'emoji',
      label: '',
      sortable: false,
      render: (row) => <span className="text-lg">{row.emoji || '🐛'}</span>,
    },
    {
      key: 'common_name',
      label: 'Name',
      render: (row) => (
        <button
          className="text-left font-medium hover:underline"
          onClick={() => navigate(`/pests/${row.id}`)}
        >
          {row.common_name}
        </button>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <Badge className={`${CATEGORY_COLORS[row.category] ?? ''} capitalize text-xs`} variant="outline">
          {row.category}
        </Badge>
      ),
    },
    {
      key: 'severity_potential',
      label: 'Severity',
      render: (row) => (
        <Badge className={`${SEVERITY_COLORS[row.severity_potential] ?? ''} capitalize text-xs`} variant="outline">
          {row.severity_potential}
        </Badge>
      ),
    },
    {
      key: 'spread_rate',
      label: 'Spread',
      render: (row) => <span className="capitalize">{row.spread_rate}</span>,
    },
    {
      key: 'damage_type',
      label: 'Damage',
      render: (row) => <span className="capitalize">{row.damage_type?.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'affected_plants',
      label: 'Affected Plants',
      sortable: false,
      render: (row) => {
        const plants = row.affected_plants ?? [];
        return <span className="text-muted-foreground">{plants.length} plants</span>;
      },
    },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pests & diseases..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={v => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value || ' '}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={v => { setSeverity(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="All Severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value || ' '}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ViewToggleButtons view={view} onToggle={toggleView} primaryView="card" tableView="table" />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && pests.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No pests or diseases found. Try adjusting your filters.
        </p>
      )}

      {!isLoading && pests.length > 0 && view === 'table' && (
        <DataTable
          data={pests}
          columns={tableColumns}
          searchable={false}
          exportFilename="pest-catalog"
        />
      )}

      {!isLoading && pests.length > 0 && view === 'card' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pests.map((pest: any) => (
              <Card
                key={pest.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => navigate(`/pests/${pest.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm">
                      <span className="mr-1">{pest.emoji || '🐛'}</span>
                      {pest.common_name}
                    </h3>
                    <Badge className={`${CATEGORY_COLORS[pest.category] ?? ''} capitalize text-xs shrink-0 ml-2`} variant="outline">
                      {pest.category}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`${SEVERITY_COLORS[pest.severity_potential] ?? ''} capitalize text-xs`} variant="outline">
                      {pest.severity_potential}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">{pest.damage_type?.replace(/_/g, ' ')}</span>
                  </div>
                  {pest.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{pest.description}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {(pest.affected_plants ?? []).length} affected plants
                  </div>
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
    </div>
  );
}
