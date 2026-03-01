import { v4 as uuid } from 'uuid';
import webpush from 'web-push';
import type Database from 'better-sqlite3';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export type NotificationType = 'tasks' | 'frost' | 'harvests';

export class PushService {
  private configured = false;

  constructor(private db: Database.Database) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL;

    if (publicKey && privateKey && email) {
      webpush.setVapidDetails(email, publicKey, privateKey);
      this.configured = true;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  }

  subscribe(subscription: PushSubscriptionData, preferences: Record<string, boolean> = {}): any {
    const id = uuid();
    const existing = this.db.prepare(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?'
    ).get(subscription.endpoint) as { id: string } | undefined;

    if (existing) {
      return this.db.prepare(
        `UPDATE push_subscriptions SET keys_p256dh = ?, keys_auth = ?, preferences = ?, updated_at = datetime('now')
         WHERE id = ? RETURNING *`
      ).get(
        subscription.keys.p256dh,
        subscription.keys.auth,
        JSON.stringify(preferences),
        existing.id,
      );
    }

    return this.db.prepare(
      `INSERT INTO push_subscriptions (id, endpoint, keys_p256dh, keys_auth, preferences)
       VALUES (?, ?, ?, ?, ?) RETURNING *`
    ).get(id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, JSON.stringify(preferences));
  }

  unsubscribe(endpoint: string): boolean {
    const result = this.db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
    return result.changes > 0;
  }

  updatePreferences(endpoint: string, preferences: Record<string, boolean>): any {
    return this.db.prepare(
      `UPDATE push_subscriptions SET preferences = ?, updated_at = datetime('now')
       WHERE endpoint = ? RETURNING *`
    ).get(JSON.stringify(preferences), endpoint);
  }

  async sendNotification(subscription: PushSubscriptionData, payload: NotificationPayload): Promise<boolean> {
    if (!this.configured) return false;

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify(payload),
      );
      return true;
    } catch (err: any) {
      // 410 Gone = subscription expired, remove it
      if (err.statusCode === 410) {
        this.unsubscribe(subscription.endpoint);
      }
      console.error(`[Push] Failed to send notification: ${err.message}`);
      return false;
    }
  }

  async broadcastByPreference(type: NotificationType, payload: NotificationPayload): Promise<number> {
    if (!this.configured) return 0;

    const subs = this.db.prepare('SELECT * FROM push_subscriptions').all() as any[];
    let sent = 0;

    for (const sub of subs) {
      const prefs = JSON.parse(sub.preferences || '{}');
      if (prefs[type] === false) continue; // Default to true if not explicitly disabled

      const success = await this.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        payload,
      );
      if (success) sent++;
    }

    return sent;
  }
}
