/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// Take control immediately on install & activate
self.skipWaiting();
clientsClaim();

// Clean up caches from older SW versions
cleanupOutdatedCaches();

// Workbox precaching (manifest injected at build time)
precacheAndRoute(self.__WB_MANIFEST);

// ─── SPA Navigation Fallback ─────────────────────────────────────
// Serve index.html for all navigation requests (SPA routing)
// This is critical for the PWA to work when opened from home screen
const navigationHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//], // Don't intercept API calls
});
registerRoute(navigationRoute);

// ─── Runtime Caching ─────────────────────────────────────────────

// API calls: DO NOT cache — always go straight to the network.
// iOS PWA / WKWebView can have issues when the SW intercepts API fetches
// (NetworkFirst can fail silently, returning stale/empty cached data).
// By not registering a route for /api/, fetch() calls bypass the SW
// entirely and go directly through the browser's native network stack.

// Images: Cache first with 30-day expiry
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// Google Fonts: Cache first with 1-year expiry
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// ─── Push Notification Handlers ──────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, icon, badge, data, tag } = payload;

    event.waitUntil(
      self.registration.showNotification(title || 'Call a Nanny', {
        body: body || '',
        icon: icon || '/pwa-192x192.png',
        badge: badge || '/pwa-192x192.png',
        tag: tag || undefined,
        data: data || {},
      })
    );
  } catch (err) {
    console.error('Push event parse error:', err);
  }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find any open window from our origin (don't require exact URL match)
      const appClient = clientList.find(
        (c) => new URL(c.url).origin === self.location.origin
      );

      if (appClient) {
        // Navigate the existing window to the booking URL, then focus it
        return (appClient as WindowClient).navigate(fullUrl).then((c) => c?.focus());
      }

      // No existing window — open a new one
      return self.clients.openWindow(fullUrl);
    })
  );
});
