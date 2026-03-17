import { useSettings } from '@/hooks/use-settings';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GardenInfoSettings } from './settings/garden-info';
import { DisplayPrefsSettings } from './settings/display-prefs';
import { NotificationSettings } from './settings/notifications';
import { DataManagementSettings } from './settings/data-management';
import { AccountSettings } from './settings/account';

export function SettingsPage() {
  const { data: settingsResp, isLoading } = useSettings();
  const settings = settingsResp?.data;

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
      <Tabs defaultValue="garden">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="garden">Garden</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        <TabsContent value="garden">
          <GardenInfoSettings />
        </TabsContent>
        <TabsContent value="display">
          <DisplayPrefsSettings />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
        <TabsContent value="data">
          <DataManagementSettings />
        </TabsContent>
        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
