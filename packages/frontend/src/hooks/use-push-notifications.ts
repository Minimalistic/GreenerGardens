import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface PushPreferences {
  tasks: boolean;
  frost: boolean;
  harvests: boolean;
}

interface VapidResponse {
  success: boolean;
  data: { publicKey: string | null; configured: boolean };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const isSupported = typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator;

  // Fetch VAPID public key
  const { data: vapidResp } = useQuery({
    queryKey: queryKeys.push.vapidKey,
    queryFn: () => api.get<VapidResponse>('/push/vapid-key'),
    enabled: isSupported,
  });

  const isConfigured = (vapidResp as VapidResponse | undefined)?.data?.configured ?? false;
  const publicKey = (vapidResp as VapidResponse | undefined)?.data?.publicKey ?? null;

  // Check current subscription on mount
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub);
    });
  }, [isSupported]);

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (preferences: PushPreferences) => {
      if (!publicKey) throw new Error('VAPID key not configured');

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') throw new Error('Notification permission denied');

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });

      setSubscription(sub);

      const subJson = sub.toJSON();

      // Send subscription to backend
      return api.post('/push/subscribe', {
        subscription: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh ?? '',
            auth: subJson.keys?.auth ?? '',
          },
        },
        preferences,
      });
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) return;

      await api.delete('/push/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
      setSubscription(null);
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: PushPreferences) => {
      if (!subscription) throw new Error('Not subscribed');

      return api.patch('/push/preferences', {
        endpoint: subscription.endpoint,
        preferences,
      });
    },
  });

  const subscribe = useCallback(
    (preferences: PushPreferences = { tasks: true, frost: true, harvests: true }) => {
      return subscribeMutation.mutateAsync(preferences);
    },
    [subscribeMutation],
  );

  const unsubscribe = useCallback(() => {
    return unsubscribeMutation.mutateAsync();
  }, [unsubscribeMutation]);

  const updatePreferences = useCallback(
    (preferences: PushPreferences) => {
      return updatePreferencesMutation.mutateAsync(preferences);
    },
    [updatePreferencesMutation],
  );

  return {
    isSupported,
    isConfigured,
    permission,
    isSubscribed: !!subscription,
    subscribe,
    unsubscribe,
    updatePreferences,
    isLoading: subscribeMutation.isPending || unsubscribeMutation.isPending,
  };
}
