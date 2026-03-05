import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePestCatalogEntry } from '@/hooks/use-pest-catalog';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertTriangle, Zap, Target, Calendar, MapPin, Shield, Leaf, FlaskConical, Bug as BugIcon, Shovel } from 'lucide-react';
import { plantTypeEmoji } from '@/lib/plant-type-emoji';
import { PLANT_TYPE_COLORS } from '@/lib/plant-type-colors';
import { cn } from '@/lib/utils';
import type { PestCatalog, TreatmentEntry } from '@gardenvault/shared';
import type { LucideIcon } from 'lucide-react';

type Treatment = string | TreatmentEntry;

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const CATEGORY_COLORS: Record<string, string> = {
  insect: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  mite: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  fungal: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  bacterial: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  viral: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  nematode: 'bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-200',
  mollusk: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  mammal: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  nutritional: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  environmental: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
};

export function PestCatalogDetail() {
  const { pestId } = useParams<{ pestId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePestCatalogEntry(pestId ?? null);
  const { data: catalogData } = usePlantCatalogSearch({ limit: 500 });

  const plantLookup = useMemo(() => {
    const entries = catalogData?.data ?? [];
    const map = new Map<string, { id: string; emoji?: string; plant_type?: string }>();
    for (const entry of entries) {
      map.set(entry.common_name.toLowerCase(), { id: entry.id, emoji: entry.emoji, plant_type: entry.plant_type });
    }
    return (name: string) => map.get(name.toLowerCase());
  }, [catalogData]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const pest = data?.data as PestCatalog | undefined;
  if (!pest) return <p>Pest not found</p>;

  const affectedPlants: string[] = pest.affected_plants ?? [];
  const appearance: string[] = pest.appearance ?? [];
  const symptoms: string[] = pest.symptoms ?? [];
  const favorableConditions: string[] = pest.favorable_conditions ?? [];
  const prevention: string[] = pest.prevention ?? [];
  const organicTreatments: Treatment[] = pest.organic_treatments ?? [];
  const chemicalTreatments: Treatment[] = pest.chemical_treatments ?? [];
  const biologicalTreatments: Treatment[] = pest.biological_treatments ?? [];
  const culturalTreatments: Treatment[] = pest.cultural_treatments ?? [];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/pests')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{pest.emoji || '🐛'}</span>
            <h2 className="text-xl font-semibold truncate">{pest.common_name}</h2>
          </div>
          {pest.scientific_name && (
            <p className="text-sm text-muted-foreground italic truncate">{pest.scientific_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${CATEGORY_COLORS[pest.category] ?? ''} capitalize`} variant="outline">
            {pest.category}
          </Badge>
          <Badge className={`${SEVERITY_COLORS[pest.severity_potential ?? ''] ?? ''} capitalize`} variant="outline">
            {pest.severity_potential}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto justify-start sm:justify-center">
          <TabsTrigger value="overview" className="px-2 sm:px-3 text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="identification" className="px-2 sm:px-3 text-xs sm:text-sm">Identification</TabsTrigger>
          <TabsTrigger value="treatment" className="px-2 sm:px-3 text-xs sm:text-sm">Treatment</TabsTrigger>
          <TabsTrigger value="plants" className="px-2 sm:px-3 text-xs sm:text-sm">Affected Plants</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {pest.description && <p className="text-sm">{pest.description}</p>}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FactCard icon={AlertTriangle} label="Severity" value={pest.severity_potential ?? ''} />
            <FactCard icon={Zap} label="Spread Rate" value={pest.spread_rate ?? ''} />
            <FactCard icon={Target} label="Damage Type" value={pest.damage_type?.replace(/_/g, ' ') ?? ''} />
            {pest.seasonality && <FactCard icon={Calendar} label="Seasonality" value={pest.seasonality} />}
            {(pest.min_zone || pest.max_zone) && (
              <FactCard icon={MapPin} label="USDA Zones" value={`${pest.min_zone ?? '?'} - ${pest.max_zone ?? '?'}`} />
            )}
            {pest.subcategory && <FactCard icon={BugIcon} label="Subcategory" value={pest.subcategory} />}
          </div>

          {favorableConditions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Favorable Conditions</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {favorableConditions.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Identification Tab */}
        <TabsContent value="identification" className="space-y-4">
          {appearance.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Appearance</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {appearance.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {symptoms.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Symptoms</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {symptoms.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {pest.life_cycle && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Life Cycle</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">{pest.life_cycle}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Treatment Tab */}
        <TabsContent value="treatment" className="space-y-4">
          {prevention.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" /> Prevention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {prevention.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {organicTreatments.length > 0 && (
            <TreatmentSection
              title="Organic Treatments"
              icon={Leaf}
              iconColor="text-green-500"
              treatments={organicTreatments}
            />
          )}

          {biologicalTreatments.length > 0 && (
            <TreatmentSection
              title="Biological Controls"
              icon={BugIcon}
              iconColor="text-teal-500"
              treatments={biologicalTreatments}
            />
          )}

          {culturalTreatments.length > 0 && (
            <TreatmentSection
              title="Cultural Practices"
              icon={Shovel}
              iconColor="text-amber-500"
              treatments={culturalTreatments}
            />
          )}

          {chemicalTreatments.length > 0 && (
            <TreatmentSection
              title="Chemical Treatments"
              icon={FlaskConical}
              iconColor="text-red-500"
              treatments={chemicalTreatments}
            />
          )}
        </TabsContent>

        {/* Affected Plants Tab */}
        <TabsContent value="plants" className="space-y-4">
          {affectedPlants.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No specific plants listed.
            </p>
          )}
          {affectedPlants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {affectedPlants.map((name, i) => {
                const plant = plantLookup(name);
                const emoji = plant?.emoji || plantTypeEmoji(plant?.plant_type);
                const colorClass = plant?.plant_type ? PLANT_TYPE_COLORS[plant.plant_type] ?? PLANT_TYPE_COLORS.other : '';
                const badge = (
                  <Badge
                    key={i}
                    variant="outline"
                    className={cn(
                      plant?.id && 'cursor-pointer hover:ring-1 hover:ring-ring',
                      colorClass,
                    )}
                  >
                    <span className="mr-0.5 plant-emoji">{emoji}</span>
                    {name}
                  </Badge>
                );
                return plant?.id ? <Link key={i} to={`/catalog/${plant.id}`}>{badge}</Link> : badge;
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FactCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

function TreatmentSection({ title, icon: Icon, iconColor, treatments }: {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  treatments: Treatment[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1 list-disc list-inside">
          {treatments.map((t, i) => (
            <li key={i}>{typeof t === 'string' ? t : t.name}{typeof t !== 'string' && t.description ? ` — ${t.description}` : ''}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
