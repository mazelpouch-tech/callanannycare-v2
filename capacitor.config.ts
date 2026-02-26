import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.callanannycare.app',
  appName: 'Call a Nanny',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#f97316',
      overlaysWebView: false,
    },
  },
};

export default config;
