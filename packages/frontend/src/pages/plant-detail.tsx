import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlantCatalogEntry } from '@/hooks/use-plant-catalog';
import { PlantFormDialog } from '@/components/plant-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Sun, Droplets, Ruler, Clock, Pencil } from 'lucide-react';
import { EntityNotes } from '@/components/notes/entity-notes';

export function PlantDetail() {
  const { plantId } = useParams<{ plantId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePlantCatalogEntry(plantId ?? null);
  const [formOpen, setFormOpen] = useState(false);

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

  const p = plant as any;
  const isCustom = p.is_custom === 1;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/catalog')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{p.common_name}</h2>
            {isCustom && <Badge variant="secondary">Custom</Badge>}
          </div>
          {p.scientific_name && (
            <p className="text-sm text-muted-foreground italic">{p.scientific_name}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{p.plant_type}</Badge>
          {isCustom && (
            <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit
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
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="growing">Growing</TabsTrigger>
          <TabsTrigger value="planting">Planting</TabsTrigger>
          <TabsTrigger value="companions">Companions</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {p.description && <p className="text-sm">{p.description}</p>}
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
          {p.growing_tips?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Growing Tips</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {p.growing_tips.map((tip: string, i: number) => (
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
          {p.companions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-green-700">Good Companions</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {p.companions.map((c: string) => (
                    <Badge key={c} variant="outline" className="bg-green-50">{c}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {p.antagonists?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-red-700">Avoid Planting Near</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {p.antagonists.map((a: string) => (
                    <Badge key={a} variant="outline" className="bg-red-50">{a}</Badge>
                  ))}
                </div>
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

        <TabsContent value="notes">
          <EntityNotes entityType="plant_catalog" entityId={plantId!} />
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
