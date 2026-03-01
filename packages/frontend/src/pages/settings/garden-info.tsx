import { useEffect } from 'react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';

interface GardenInfoFormData {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  usda_zone: string;
  timezone: string;
  last_frost_date: string;
  first_frost_date: string;
  total_area_sqft: string;
}

export function GardenInfoSettings() {
  const { data: settingsResp } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm<GardenInfoFormData>();

  const settings = settingsResp?.data;

  useEffect(() => {
    if (settings) {
      reset({
        name: settings.name ?? '',
        description: settings.description ?? '',
        address: settings.address ?? '',
        latitude: settings.latitude?.toString() ?? '',
        longitude: settings.longitude?.toString() ?? '',
        usda_zone: settings.usda_zone ?? '',
        timezone: settings.timezone ?? '',
        last_frost_date: settings.last_frost_date ?? '',
        first_frost_date: settings.first_frost_date ?? '',
        total_area_sqft: settings.total_area_sqft?.toString() ?? '',
      });
    }
  }, [settings, reset]);

  const onSave = async (formData: GardenInfoFormData) => {
    try {
      await updateSettings.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        address: formData.address || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        usda_zone: formData.usda_zone || undefined,
        timezone: formData.timezone || undefined,
        last_frost_date: formData.last_frost_date || undefined,
        first_frost_date: formData.first_frost_date || undefined,
        total_area_sqft: formData.total_area_sqft ? parseFloat(formData.total_area_sqft) : undefined,
      });
      toast({ title: 'Garden info saved!' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Garden Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Garden Name</Label>
            <Input id="name" {...register('name', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} placeholder="Optional description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} placeholder="Garden address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" step="any" {...register('latitude')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="any" {...register('longitude')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usda_zone">USDA Zone</Label>
              <Input id="usda_zone" {...register('usda_zone')} placeholder="e.g., 7b" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...register('timezone')} placeholder="e.g., America/New_York" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last_frost_date">Last Frost Date (Spring)</Label>
              <Input id="last_frost_date" type="date" {...register('last_frost_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_frost_date">First Frost Date (Fall)</Label>
              <Input id="first_frost_date" type="date" {...register('first_frost_date')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_area_sqft">Total Garden Area (sq ft)</Label>
            <Input id="total_area_sqft" type="number" step="any" {...register('total_area_sqft')} placeholder="Optional" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
        <Save className="w-4 h-4 mr-2" />
        {updateSettings.isPending ? 'Saving...' : 'Save Garden Info'}
      </Button>
    </form>
  );
}
