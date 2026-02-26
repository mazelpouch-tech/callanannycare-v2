import { NATIVE_API_BASE } from './native';
const API_BASE = NATIVE_API_BASE;

/** Check if push notifications are supported in this browser/PWA context. */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Check if app is running as installed PWA (required for iOS push). */
export function isInstalledPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Get the current push permission state. */
export function getPushPermission(): NotificationPermission {
  return Notification.permission;
}

/** Convert a base64 VAPID key to Uint8Array for PushManager.subscribe(). */
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

/** Fetch VAPID public key from server. */
async function getVapidKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/push`);
  const data = await res.json();
  return data.vapidPublicKey;
}

/**
 * Subscribe to push notifications.
 * MUST be called on a user gesture (click handler) for iOS compliance.
 * Returns { ok: true } on success, or { ok: false, error: string } on failure.
 */
export async function subscribeToPush(
  userType: 'admin' | 'nanny',
  userId: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: `Permission ${permission}. Go to Settings > Notifications > Call a Nanny and allow notifications.` };
    }

    const registration = await navigator.serviceWorker.ready;

    let vapidKey: string;
    try {
      vapidKey = await getVapidKey();
    } catch {
      return { ok: false, error: 'Could not fetch server key. Check your connection.' };
    }

    if (!vapidKey) {
      return { ok: false, error: 'Server VAPID key is empty. Contact admin.' };
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const res = await fetch(`${API_BASE}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_type: userType,
        user_id: userId,
        subscription: subscription.toJSON(),
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Server error ${res.status}. Try again.` };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Push subscription failed:', err);
    return { ok: false, error: msg };
  }
}

/** Unsubscribe from push notifications. */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    await subscription.unsubscribe();

    await fetch(`${API_BASE}/api/push`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    return true;
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
    return false;
  }
}

/** Check if the user is currently subscribed to push. */
export async function isSubscribedToPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
