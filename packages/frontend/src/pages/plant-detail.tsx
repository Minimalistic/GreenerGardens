import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlantCatalogEntry, usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import { usePestCatalogSearch } from '@/hooks/use-pest-catalog';
import { useWikipediaSummary } from '@/hooks/use-wikipedia';
import { PlantFormDialog } from '@/components/plant-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlantTypeBadge } from '@/components/garden/plant-type-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Sun, Droplets, Ruler, Clock, Pencil, ExternalLink, ShieldAlert } from 'lucide-react';
import { EntityNotes } from '@/components/notes/entity-notes';
import { PlantActivityTab } from '@/components/garden/plant-activity-tab';
import { plantTypeEmoji } from '@/lib/plant-type-emoji';

export function PlantDetail() {
  const { plantId } = useParams<{ plantId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePlantCatalogEntry(plantId ?? null);
  const { data: wikiResponse, isLoading: wikiLoading } = useWikipediaSummary(plantId ?? null);
  const { data: catalogData } = usePlantCatalogSearch({ limit: 500 });
  const catalogEntries = catalogData?.data ?? [];
  const plantNameToId = useMemo(() => {
    const exact = new Map<string, string>();
    for (const entry of catalogEntries) {
      exact.set(entry.common_name.toLowerCase(), entry.id);
    }
    return (name: string): string | undefined => {
      const lower = name.toLowerCase();
      // Exact match first
      if (exact.has(lower)) return exact.get(lower);
      // Try to find a catalog entry that contains the companion name or vice versa
      for (const entry of catalogEntries) {
        const entryName = entry.common_name.toLowerCase();
        if (entryName.includes(lower) || lower.includes(entryName)) {
          return entry.id;
        }
      }
      return undefined;
    };
  }, [catalogEntries]);
  const [formOpen, setFormOpen] = useState(false);
  const { data: pestCatalogData } = usePestCatalogSearch({ limit: 200 });
  const pestNameToId = useMemo(() => {
    const entries = pestCatalogData?.data ?? [];
    const map = new Map<string, string>();
    for (const entry of entries) {
      map.set(entry.common_name.toLowerCase(), entry.id);
    }
    return (name: string): string | undefined => map.get(name.toLowerCase());
  }, [pestCatalogData]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const plant = data?.data;
  if (!plant) return <p>Plant not found</p>;

  const p = plant;
  const isCustom = p.is_custom === 1;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/catalog')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl plant-emoji">{plantTypeEmoji(p.plant_type)}</span>
            <h2 className="text-xl font-semibold truncate">{p.common_name}</h2>
            {isCustom && <Badge variant="secondary">Custom</Badge>}
          </div>
          {p.scientific_name && (
            <p className="text-sm text-muted-foreground italic truncate">{p.scientific_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={p.wikipedia_url || `https://en.wikipedia.org/wiki/${encodeURIComponent((p.common_name as string).replace(/ /g, '_'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wikipedia</span>
          </a>
          <PlantTypeBadge plantType={p.plant_type} />
          {isCustom && (
            <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
              <Pencil className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}
        </div>
      </div>

      {p.image_url && (
        <div className="rounded-lg overflow-hidden bg-muted">
          <img
            src={p.image_url}
            alt={p.common_name}
            className="w-full max-h-64 object-cover"
          />
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto justify-start sm:justify-center">
          <TabsTrigger value="overview" className="px-2 sm:px-3 text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="growing" className="px-2 sm:px-3 text-xs sm:text-sm">Growing</TabsTrigger>
          <TabsTrigger value="planting" className="px-2 sm:px-3 text-xs sm:text-sm">Planting</TabsTrigger>
          <TabsTrigger value="companions" className="px-2 sm:px-3 text-xs sm:text-sm">Companions</TabsTrigger>
          <TabsTrigger value="pests" className="px-2 sm:px-3 text-xs sm:text-sm">Pests</TabsTrigger>
          <TabsTrigger value="notes" className="px-2 sm:px-3 text-xs sm:text-sm">Notes</TabsTrigger>
          <TabsTrigger value="activity" className="px-2 sm:px-3 text-xs sm:text-sm">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {p.description && <p className="text-sm">{p.description}</p>}
          {wikiLoading && (
            <Card>
              <CardContent className="pt-4 flex gap-4">
                <Skeleton className="w-24 h-24 rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          )}
          {wikiResponse?.data && (
            <a
              href={p.wikipedia_url || `https://en.wikipedia.org/wiki/${encodeURIComponent((p.common_name as string).replace(/ /g, '_'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="pt-4 flex gap-4">
                  {wikiResponse.data.thumbnail_url && (
                    <img
                      src={wikiResponse.data.thumbnail_url}
                      alt={p.common_name}
                      className="w-24 h-24 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {wikiResponse.data.description && (
                      <p className="text-sm italic text-muted-foreground mb-1">
                        {wikiResponse.data.description}
                      </p>
                    )}
                    {wikiResponse.data.extract && (
                      <p className="text-sm line-clamp-4">{wikiResponse.data.extract}</p>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <ExternalLink className="w-3 h-3" />
                      Source: Wikipedia (CC BY-SA 4.0)
                    </span>
                  </div>
                </CardContent>
              </Card>
            </a>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {p.sun_exposure && (
              <InfoCard icon={Sun} label="Sun" value={p.sun_exposure.replace(/_/g, ' ')} />
            )}
            {p.water_needs && (
              <InfoCard icon={Droplets} label="Water" value={p.water_needs.replace(/_/g, ' ')} />
            )}
            {p.spacing_inches && (
              <InfoCard icon={Ruler} label="Spacing" value={`${p.spacing_inches}"`} />
            )}
            {p.days_to_maturity_min && (
              <InfoCard
                icon={Clock}
                label="Maturity"
                value={`${p.days_to_maturity_min}-${p.days_to_maturity_max ?? '?'} days`}
              />
            )}
          </div>
          {(p.growing_tips?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Growing Tips</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {p.growing_tips!.map((tip: string, i: number) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="growing" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {p.lifecycle && <InfoRow label="Lifecycle" value={p.lifecycle} />}
              {p.family && <InfoRow label="Family" value={p.family} />}
              {(p.min_zone || p.max_zone) && (
                <InfoRow label="USDA Zones" value={`${p.min_zone ?? '?'} - ${p.max_zone ?? '?'}`} />
              )}
              {(p.soil_ph_min || p.soil_ph_max) && (
                <InfoRow label="Soil pH" value={`${p.soil_ph_min ?? '?'} - ${p.soil_ph_max ?? '?'}`} />
              )}
              {(p.height_inches_min || p.height_inches_max) && (
                <InfoRow label="Height" value={`${p.height_inches_min ?? '?'}" - ${p.height_inches_max ?? '?'}"`} />
              )}
              {p.row_spacing_inches && <InfoRow label="Row Spacing" value={`${p.row_spacing_inches}"`} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planting" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {p.planting_depth_inches != null && (
                <InfoRow label="Planting Depth" value={`${p.planting_depth_inches}"`} />
              )}
              {(p.days_to_germination_min || p.days_to_germination_max) && (
                <InfoRow label="Germination" value={`${p.days_to_germination_min ?? '?'}-${p.days_to_germination_max ?? '?'} days`} />
              )}
              {p.indoor_start_weeks_before_frost && (
                <InfoRow label="Start Indoors" value={`${p.indoor_start_weeks_before_frost} weeks before last frost`} />
              )}
              {p.outdoor_sow_weeks_after_frost != null && (
                <InfoRow label="Direct Sow" value={`${p.outdoor_sow_weeks_after_frost} weeks after last frost`} />
              )}
            </CardContent>
          </Card>
          {p.harvest_instructions && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Harvest</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{p.harvest_instructions}</p></CardContent>
            </Card>
          )}
          {p.storage_instructions && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Storage</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{p.storage_instructions}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="companions" className="space-y-4">
          {(p.companions?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-green-700 dark:text-green-400">Good Companions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {p.companions!.map((c: any, i: number) => {
                  const name = typeof c === 'string' ? c : c.name;
                  const notes = typeof c === 'string' ? null : c.notes;
                  const rel = typeof c === 'string' ? null : c.relationship;
                  const linkedId = plantNameToId(name);
                  return (
                    <div key={i} className="flex items-start gap-2">
                      {linkedId ? (
                        <Link to={`/catalog/${linkedId}`}>
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950 shrink-0 hover:bg-green-100 dark:hover:bg-green-900 cursor-pointer transition-colors">{name}</Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950 shrink-0">{name}</Badge>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {rel && <span className="capitalize">{rel.replace(/_/g, ' ')}</span>}
                        {rel && notes && <span> &mdash; </span>}
                        {notes && <span>{notes}</span>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {(p.antagonists?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-red-700 dark:text-red-400">Avoid Planting Near</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {p.antagonists!.map((a: any, i: number) => {
                  const name = typeof a === 'string' ? a : a.name;
                  const notes = typeof a === 'string' ? null : a.notes;
                  const rel = typeof a === 'string' ? null : a.relationship;
                  const linkedId = plantNameToId(name);
                  return (
                    <div key={i} className="flex items-start gap-2">
                      {linkedId ? (
                        <Link to={`/catalog/${linkedId}`}>
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-950 shrink-0 hover:bg-red-100 dark:hover:bg-red-900 cursor-pointer transition-colors">{name}</Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 dark:bg-red-950 shrink-0">{name}</Badge>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {rel && <span className="capitalize">{rel.replace(/_/g, ' ')}</span>}
                        {rel && notes && <span> &mdash; </span>}
                        {notes && <span>{notes}</span>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {p.rotation_family && (
            <Card>
              <CardContent className="pt-4">
                <InfoRow label="Rotation Family" value={p.rotation_family} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pests" className="space-y-4">
          <PestsDiseasesTab plant={p} pestNameToId={pestNameToId} />
        </TabsContent>

        <TabsContent value="notes">
          <EntityNotes entityType="plant_catalog" entityId={plantId!} />
        </TabsContent>

        <TabsContent value="activity">
          <PlantActivityTab plantId={plantId!} />
        </TabsContent>
      </Tabs>

      <PlantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        plant={isCustom ? p : undefined}
        onDeleted={() => navigate('/catalog')}
      />
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}

const SUSCEPTIBILITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const RESISTANCE_COLORS: Record<string, string> = {
  low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  immune: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

function PestsDiseasesTab({ plant, pestNameToId }: { plant: any; pestNameToId: (name: string) => string | undefined }) {
  const commonPests: any[] = plant.common_pests ?? [];
  const commonDiseases: any[] = plant.common_diseases ?? [];
  const diseaseResistance: Record<string, string> = plant.disease_resistance ?? {};
  const hasContent = commonPests.length > 0 || commonDiseases.length > 0 || Object.keys(diseaseResistance).length > 0;

  if (!hasContent) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No pest or disease data available for this plant.
      </p>
    );
  }

  return (
    <>
      {commonPests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-500" /> Common Pests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {commonPests.map((entry: any, i: number) => {
              const linkedId = pestNameToId(entry.name);
              return (
                <div key={i} className="flex items-start gap-2">
                  {linkedId ? (
                    <Link to={`/pests/${linkedId}`}>
                      <Badge variant="outline" className="shrink-0 hover:bg-muted cursor-pointer transition-colors">
                        {entry.name}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="outline" className="shrink-0">{entry.name}</Badge>
                  )}
                  <Badge className={`${SUSCEPTIBILITY_COLORS[entry.susceptibility] ?? ''} capitalize text-xs shrink-0`} variant="outline">
                    {entry.susceptibility}
                  </Badge>
                  {entry.notes && <span className="text-xs text-muted-foreground">{entry.notes}</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {commonDiseases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-500" /> Common Diseases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {commonDiseases.map((entry: any, i: number) => {
              const linkedId = pestNameToId(entry.name);
              return (
                <div key={i} className="flex items-start gap-2">
                  {linkedId ? (
                    <Link to={`/pests/${linkedId}`}>
                      <Badge variant="outline" className="shrink-0 hover:bg-muted cursor-pointer transition-colors">
                        {entry.name}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="outline" className="shrink-0">{entry.name}</Badge>
                  )}
                  <Badge className={`${SUSCEPTIBILITY_COLORS[entry.susceptibility] ?? ''} capitalize text-xs shrink-0`} variant="outline">
                    {entry.susceptibility}
                  </Badge>
                  {entry.notes && <span className="text-xs text-muted-foreground">{entry.notes}</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {Object.keys(diseaseResistance).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-green-500" /> Disease Resistance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(diseaseResistance).map(([disease, level], i) => {
              const linkedId = pestNameToId(disease);
              return (
                <div key={i} className="flex items-center gap-2">
                  {linkedId ? (
                    <Link to={`/pests/${linkedId}`}>
                      <span className="text-sm hover:underline cursor-pointer">{disease}</span>
                    </Link>
                  ) : (
                    <span className="text-sm">{disease}</span>
                  )}
                  <Badge className={`${RESISTANCE_COLORS[level] ?? ''} capitalize text-xs`} variant="outline">
                    {level}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}
