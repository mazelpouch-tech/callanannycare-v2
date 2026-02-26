/**
 * native.ts — Capacitor native feature utilities
 * All functions gracefully no-op on web; safe to call in any context.
 */

import { Capacitor } from '@capacitor/core';

// ─── Platform detection ───────────────────────────────────────────

export const isNative = () => Capacitor.isNativePlatform();

/** Base URL for API calls — empty on web (relative), absolute on native */
export const NATIVE_API_BASE = isNative()
  ? 'https://callanannycare.vercel.app'
  : '';

// ─── Status bar ──────────────────────────────────────────────────

export async function initStatusBar() {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#f97316' });
    await StatusBar.show();
  } catch (e) {
    console.warn('StatusBar init failed:', e);
  }
}

// ─── Haptics ─────────────────────────────────────────────────────

export async function hapticImpact() {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    // silent
  }
}

export async function hapticSuccess() {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch (e) {
    // silent
  }
}

export async function hapticError() {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch (e) {
    // silent
  }
}

export async function hapticLight() {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // silent
  }
}

// ─── Biometric authentication ─────────────────────────────────────

const BIOMETRIC_SERVER_NANNY = 'nanny.callanannycare.vercel.app';
const BIOMETRIC_SERVER_ADMIN = 'admin.callanannycare.vercel.app';

/** Check if biometric auth is available on this device */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/** Save credentials to Keychain after successful login */
export async function saveBiometricCredentials(
  role: 'nanny' | 'admin',
  username: string,
  password: string
): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const server = role === 'nanny' ? BIOMETRIC_SERVER_NANNY : BIOMETRIC_SERVER_ADMIN;
    await NativeBiometric.setCredentials({ username, password, server });
    localStorage.setItem(`biometric_enabled_${role}`, '1');
    return true;
  } catch {
    return false;
  }
}

/** Retrieve stored credentials via Face ID / Touch ID prompt */
export async function getBiometricCredentials(
  role: 'nanny' | 'admin'
): Promise<{ username: string; password: string } | null> {
  if (!isNative()) return null;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const server = role === 'nanny' ? BIOMETRIC_SERVER_NANNY : BIOMETRIC_SERVER_ADMIN;

    // Verify identity first (shows Face ID / Touch ID dialog)
    await NativeBiometric.verifyIdentity({
      reason: 'Sign in to Call a Nanny',
      title: 'Use Face ID to Sign In',
      subtitle: '',
      description: '',
    });

    // If verification passed, retrieve the credentials
    const creds = await NativeBiometric.getCredentials({ server });
    return { username: creds.username, password: creds.password };
  } catch {
    // User cancelled or biometric failed
    return null;
  }
}

/** Check if biometric login has been enabled for a role */
export function isBiometricEnabled(role: 'nanny' | 'admin'): boolean {
  if (!isNative()) return false;
  return localStorage.getItem(`biometric_enabled_${role}`) === '1';
}

/** Remove saved credentials (e.g. on logout) */
export async function clearBiometricCredentials(role: 'nanny' | 'admin') {
  if (!isNative()) return;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const server = role === 'nanny' ? BIOMETRIC_SERVER_NANNY : BIOMETRIC_SERVER_ADMIN;
    await NativeBiometric.deleteCredentials({ server });
    localStorage.removeItem(`biometric_enabled_${role}`);
  } catch {
    // silent
  }
}

// ─── Native push notifications ────────────────────────────────────

/** Register for native APNs push notifications. Returns device token or null. */
export async function registerNativePush(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const result = await PushNotifications.requestPermissions();
    if (result.receive !== 'granted') return null;

    await PushNotifications.register();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 8000);

      PushNotifications.addListener('registration', (token) => {
        clearTimeout(timeout);
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch {
    return null;
  }
}

/** Set up foreground notification display handler */
export async function initPushListeners() {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Show notifications even when app is in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification);
    });

    // Handle tapping a notification
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url;
      if (url) {
        window.location.hash = url;
      }
    });
  } catch {
    // silent
  }
}
