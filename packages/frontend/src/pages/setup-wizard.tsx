import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompleteSetup } from '@/hooks/use-setup';
import { useGardenContext } from '@/contexts/garden-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { lookupZoneClient, lookupFrostDatesClient } from '@/lib/zone-utils';
import { Sprout, MapPin, Thermometer, Check } from 'lucide-react';

type Step = 'welcome' | 'name' | 'location' | 'zone' | 'summary';

interface GardenData {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  usda_zone: string;
  timezone: string;
  last_frost_date: string;
  first_frost_date: string;
}

export function SetupWizard() {
  const navigate = useNavigate();
  const { setCurrentGardenId } = useGardenContext();
  const setupMutation = useCompleteSetup();
  const [step, setStep] = useState<Step>('welcome');
  const [data, setData] = useState<GardenData>({
    name: '',
    address: '',
    latitude: null,
    longitude: null,
    usda_zone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    last_frost_date: '',
    first_frost_date: '',
  });

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const zone = lookupZoneClient(lat);
        const frost = zone ? lookupFrostDatesClient(zone) : null;
        setData(d => ({
          ...d,
          latitude: lat,
          longitude: lon,
          usda_zone: zone ?? '',
          last_frost_date: frost?.lastFrost ?? '',
          first_frost_date: frost?.firstFrost ?? '',
        }));
        setStep('zone');
      },
      () => setStep('zone'),
    );
  };

  const handleComplete = async () => {
    const body: any = { name: data.name };
    if (data.address) body.address = data.address;
    if (data.latitude != null) body.latitude = data.latitude;
    if (data.longitude != null) body.longitude = data.longitude;
    if (data.usda_zone) body.usda_zone = data.usda_zone;
    if (data.timezone) body.timezone = data.timezone;
    if (data.last_frost_date) body.last_frost_date = data.last_frost_date;
    if (data.first_frost_date) body.first_frost_date = data.first_frost_date;

    const result = await setupMutation.mutateAsync(body);
    setCurrentGardenId(result.data.id);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 parchment-texture">
      <Card className="w-full max-w-lg">
        {step === 'welcome' && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full garden-gradient flex items-center justify-center mb-4">
                <Sprout className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Welcome to GardenVault</CardTitle>
              <CardDescription>
                Your digital garden journal. Track your plants, plan your layout, and log your harvests.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Button className="w-full" size="lg" onClick={() => setStep('name')}>
                Get Started
              </Button>
            </CardContent>
          </>
        )}

        {step === 'name' && (
          <>
            <CardHeader>
              <CardTitle>Name Your Garden</CardTitle>
              <CardDescription>What would you like to call your garden?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Garden Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Backyard Garden"
                  value={data.name}
                  onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  placeholder="e.g., 123 Garden St"
                  value={data.address}
                  onChange={e => setData(d => ({ ...d, address: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('welcome')}>Back</Button>
                <Button
                  className="flex-1"
                  disabled={!data.name.trim()}
                  onClick={() => setStep('location')}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 'location' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
              <CardDescription>
                Help us determine your growing zone and frost dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full" onClick={detectLocation}>
                <MapPin className="w-4 h-4 mr-2" />
                Auto-detect My Location
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.001"
                    placeholder="e.g., 40.7"
                    value={data.latitude ?? ''}
                    onChange={e => setData(d => ({ ...d, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lon">Longitude</Label>
                  <Input
                    id="lon"
                    type="number"
                    step="0.001"
                    placeholder="e.g., -74.0"
                    value={data.longitude ?? ''}
                    onChange={e => setData(d => ({ ...d, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('name')}>Back</Button>
                <Button className="flex-1" onClick={() => {
                  if (data.latitude != null) {
                    const zone = lookupZoneClient(data.latitude);
                    const frost = zone ? lookupFrostDatesClient(zone) : null;
                    setData(d => ({
                      ...d,
                      usda_zone: zone ?? d.usda_zone,
                      last_frost_date: frost?.lastFrost ?? d.last_frost_date,
                      first_frost_date: frost?.firstFrost ?? d.first_frost_date,
                    }));
                  }
                  setStep('zone');
                }}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 'zone' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="w-5 h-5" />
                Growing Zone
              </CardTitle>
              <CardDescription>
                Confirm your USDA zone and frost dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zone">USDA Zone</Label>
                <Input
                  id="zone"
                  placeholder="e.g., 7a"
                  value={data.usda_zone}
                  onChange={e => setData(d => ({ ...d, usda_zone: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastFrost">Last Frost (MM-DD)</Label>
                  <Input
                    id="lastFrost"
                    placeholder="e.g., 04-15"
                    value={data.last_frost_date}
                    onChange={e => setData(d => ({ ...d, last_frost_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstFrost">First Frost (MM-DD)</Label>
                  <Input
                    id="firstFrost"
                    placeholder="e.g., 10-15"
                    value={data.first_frost_date}
                    onChange={e => setData(d => ({ ...d, first_frost_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('location')}>Back</Button>
                <Button className="flex-1" onClick={() => setStep('summary')}>Continue</Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 'summary' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                Review Your Garden
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{data.name}</span>
                </div>
                {data.address && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Address</span>
                    <span className="text-sm">{data.address}</span>
                  </div>
                )}
                {data.usda_zone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">USDA Zone</span>
                    <span className="text-sm">{data.usda_zone}</span>
                  </div>
                )}
                {data.last_frost_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Frost</span>
                    <span className="text-sm">{data.last_frost_date}</span>
                  </div>
                )}
                {data.first_frost_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">First Frost</span>
                    <span className="text-sm">{data.first_frost_date}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('zone')}>Back</Button>
                <Button
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={setupMutation.isPending}
                >
                  {setupMutation.isPending ? 'Creating...' : 'Create My Garden'}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
