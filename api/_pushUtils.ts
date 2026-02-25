import { getDb } from './_db.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@callanannycare.com';

// Lazy-load web-push to avoid CJS/ESM import crashes on Vercel
let webpushInstance: typeof import('web-push') extends Promise<infer T> ? T : never;
async function getWebPush() {
  if (!webpushInstance) {
    const mod = await import('web-push');
    webpushInstance = mod.default || mod;
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpushInstance.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }
  }
  return webpushInstance;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

interface SubRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send push notification to a specific user (admin or nanny). Best-effort, non-blocking. */
export async function sendPushToUser(
  userType: 'admin' | 'nanny',
  userId: number,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const webpush = await getWebPush();
  const sql = getDb();
  const subs = await sql`
    SELECT id, endpoint, p256dh, auth FROM push_subscriptions
    WHERE user_type = ${userType} AND user_id = ${userId}
  ` as SubRow[];

  if (subs.length === 0) return;

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    data: { url: payload.url || '/' },
    tag: payload.tag,
  });

  const expiredIds: number[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id);
        }
        console.error(`Push to ${userType}:${userId} failed:`, statusCode || (err instanceof Error ? err.message : err));
      }
    })
  );

  if (expiredIds.length > 0) {
    await sql`DELETE FROM push_subscriptions WHERE id = ANY(${expiredIds})`;
  }
}

/** Send push notification to all admins. */
export async function sendPushToAllAdmins(payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const sql = getDb();
  const admins = await sql`
    SELECT DISTINCT user_id FROM push_subscriptions WHERE user_type = 'admin'
  ` as { user_id: number }[];

  await Promise.allSettled(
    admins.map((a) => sendPushToUser('admin', a.user_id, payload))
  );
}

/** Get the VAPID public key for client-side subscription. */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
