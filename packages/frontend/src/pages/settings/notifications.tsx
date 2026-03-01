import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Bell, BellOff } from 'lucide-react';

export function NotificationSettings() {
  const { toast } = useToast();
  const push = usePushNotifications();
  const [prefs, setPrefs] = useState({ tasks: true, frost: true, harvests: true });

  if (!push.isSupported) return null;

  const handleToggle = async () => {
    try {
      if (push.isSubscribed) {
        await push.unsubscribe();
        toast({ title: 'Notifications disabled' });
      } else {
        await push.subscribe(prefs);
        toast({ title: 'Notifications enabled' });
      }
    } catch {
      toast({ title: 'Failed to update notifications', variant: 'destructive' });
    }
  };

  const handlePrefChange = async (key: keyof typeof prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    if (push.isSubscribed) {
      try {
        await push.updatePreferences(updated);
      } catch {
        toast({ title: 'Failed to update preferences', variant: 'destructive' });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!push.isConfigured ? (
          <p className="text-sm text-muted-foreground">
            Push notifications are not configured. Add VAPID keys to enable.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {push.permission === 'denied'
                    ? 'Notifications blocked by browser. Update in browser settings.'
                    : push.isSubscribed
                      ? 'Receiving push notifications'
                      : 'Enable to receive alerts and reminders'}
                </p>
              </div>
              <Button
                variant={push.isSubscribed ? 'destructive' : 'default'}
                size="sm"
                disabled={push.isLoading || push.permission === 'denied'}
                onClick={handleToggle}
              >
                {push.isSubscribed ? (
                  <><BellOff className="w-4 h-4 mr-1" /> Disable</>
                ) : (
                  <><Bell className="w-4 h-4 mr-1" /> Enable</>
                )}
              </Button>
            </div>

            {push.isSubscribed && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">Notification Types</p>
                {([
                  { key: 'tasks' as const, label: 'Task Reminders', desc: 'Daily task due notifications' },
                  { key: 'frost' as const, label: 'Frost Alerts', desc: 'Freeze warnings from weather data' },
                  { key: 'harvests' as const, label: 'Harvest Reminders', desc: 'Plants approaching maturity' },
                ]).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePrefChange(key)}
                      className={prefs[key] ? 'text-green-600' : 'text-muted-foreground'}
                    >
                      {prefs[key] ? 'On' : 'Off'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
