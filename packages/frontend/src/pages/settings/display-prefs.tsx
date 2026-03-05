import { useEffect } from 'react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';

interface DisplayPrefsFormData {
  temperature_unit: 'fahrenheit' | 'celsius';
  measurement_unit: 'imperial' | 'metric';
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
}

export function DisplayPrefsSettings() {
  const { data: settingsResp } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const { setValue, handleSubmit, reset } = useForm<DisplayPrefsFormData>();

  const settings = settingsResp?.data;

  useEffect(() => {
    if (settings) {
      reset({
        temperature_unit: settings.settings?.temperature_unit ?? 'fahrenheit',
        measurement_unit: settings.settings?.measurement_unit ?? 'imperial',
        date_format: settings.settings?.date_format ?? 'MM/DD/YYYY',
      });
    }
  }, [settings, reset]);

  const onSave = async (formData: DisplayPrefsFormData) => {
    try {
      await updateSettings.mutateAsync({
        settings: {
          temperature_unit: formData.temperature_unit,
          measurement_unit: formData.measurement_unit,
          date_format: formData.date_format,
        },
      });
      toast({ title: 'Display preferences saved!' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Select defaultValue={settings?.settings?.temperature_unit ?? 'fahrenheit'} onValueChange={v => setValue('temperature_unit', v as DisplayPrefsFormData['temperature_unit'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fahrenheit">Fahrenheit</SelectItem>
                <SelectItem value="celsius">Celsius</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Measurements</Label>
            <Select defaultValue={settings?.settings?.measurement_unit ?? 'imperial'} onValueChange={v => setValue('measurement_unit', v as DisplayPrefsFormData['measurement_unit'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="imperial">Imperial (ft, lbs)</SelectItem>
                <SelectItem value="metric">Metric (m, kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select defaultValue={settings?.settings?.date_format ?? 'MM/DD/YYYY'} onValueChange={v => setValue('date_format', v as DisplayPrefsFormData['date_format'])}>
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
        {updateSettings.isPending ? 'Saving...' : 'Save Display Preferences'}
      </Button>
    </form>
  );
}
