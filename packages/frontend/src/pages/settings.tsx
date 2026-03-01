import { useEffect } from 'react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Save, Download, Database, Shield, Trash2 } from 'lucide-react';
import { useBackupList, useCreateBackup, useDeleteBackup, useIntegrityCheck, useVacuum } from '@/hooks/use-backup';

interface SettingsFormData {
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
  temperature_unit: string;
  measurement_unit: string;
  date_format: string;
}

export function SettingsPage() {
  const { data: settingsResp, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const { data: backupsData } = useBackupList();
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const integrityCheck = useIntegrityCheck();
  const vacuum = useVacuum();

  const { register, handleSubmit, reset, setValue } = useForm<SettingsFormData>();

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
        temperature_unit: settings.settings?.temperature_unit ?? 'fahrenheit',
        measurement_unit: settings.settings?.measurement_unit ?? 'imperial',
        date_format: settings.settings?.date_format ?? 'MM/DD/YYYY',
      });
    }
  }, [settings, reset]);

  const onSave = async (formData: SettingsFormData) => {
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
        settings: {
          temperature_unit: formData.temperature_unit,
          measurement_unit: formData.measurement_unit,
          date_format: formData.date_format,
        },
      });
      toast({ title: 'Settings saved!' });
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-muted-foreground">No garden configured. Complete setup first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Display Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Select defaultValue={settings.settings?.temperature_unit ?? 'fahrenheit'} onValueChange={v => setValue('temperature_unit', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fahrenheit">Fahrenheit</SelectItem>
                  <SelectItem value="celsius">Celsius</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Measurements</Label>
              <Select defaultValue={settings.settings?.measurement_unit ?? 'imperial'} onValueChange={v => setValue('measurement_unit', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Imperial (ft, lbs)</SelectItem>
                  <SelectItem value="metric">Metric (m, kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select defaultValue={settings.settings?.date_format ?? 'MM/DD/YYYY'} onValueChange={v => setValue('date_format', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download a complete copy of your garden database as a SQLite file. This backup can be opened with any SQLite viewer.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const a = document.createElement('a');
              a.href = '/api/v1/export/database-file';
              a.download = '';
              a.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Database Backup
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Backup Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={createBackup.isPending}
              onClick={async () => {
                try {
                  await createBackup.mutateAsync();
                  toast({ title: 'Backup created' });
                } catch {
                  toast({ title: 'Backup failed', variant: 'destructive' });
                }
              }}
            >
              {createBackup.isPending ? 'Creating...' : 'Create Backup'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={integrityCheck.isPending}
              onClick={async () => {
                try {
                  const result = await integrityCheck.mutateAsync();
                  toast({ title: `Integrity: ${result.data.result}` });
                } catch {
                  toast({ title: 'Check failed', variant: 'destructive' });
                }
              }}
            >
              <Shield className="w-4 h-4 mr-1" />
              {integrityCheck.isPending ? 'Checking...' : 'Integrity Check'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={vacuum.isPending}
              onClick={async () => {
                try {
                  await vacuum.mutateAsync();
                  toast({ title: 'VACUUM completed' });
                } catch {
                  toast({ title: 'VACUUM failed', variant: 'destructive' });
                }
              }}
            >
              {vacuum.isPending ? 'Running...' : 'Optimize DB'}
            </Button>
          </div>

          {backupsData?.data && backupsData.data.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Available Backups</p>
              {backupsData.data.map((b: any) => (
                <div key={b.filename} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted">
                  <div>
                    <span className="font-mono text-xs">{b.filename}</span>
                    <span className="text-muted-foreground ml-2">({(b.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = `/api/v1/backup/download/${b.filename}`;
                        a.download = '';
                        a.click();
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await deleteBackup.mutateAsync(b.filename);
                          toast({ title: 'Backup deleted' });
                        } catch {
                          toast({ title: 'Delete failed', variant: 'destructive' });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
