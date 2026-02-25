import { useState, useEffect } from 'react';
import { Bell, X, Share, Plus } from 'lucide-react';
import {
  isPushSupported,
  isInstalledPWA,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
} from '../utils/pushNotifications';

interface Props {
  userType: 'admin' | 'nanny';
  userId: number;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function PushNotificationBanner({ userType, userId }: Props) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    const check = async () => {
      const isSupp = isPushSupported();
      setSupported(isSupp);

      // On iOS Safari (not installed as PWA), push isn't available yet
      // Show a prompt to install the app instead
      if (!isSupp && isIOS() && !isInstalledPWA()) {
        setNeedsInstall(true);
        return;
      }

      if (isSupp) {
        const isSub = await isSubscribedToPush();
        setSubscribed(isSub);
      }
    };
    check();

    const key = `push_banner_dismissed_${userType}_${userId}`;
    setDismissed(localStorage.getItem(key) === 'true');
  }, [userType, userId]);

  const handleSubscribe = async () => {
    setLoading(true);
    const success = await subscribeToPush(userType, userId);
    setSubscribed(success);
    setLoading(false);
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setLoading(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    const key = `push_banner_dismissed_${userType}_${userId}`;
    localStorage.setItem(key, 'true');
  };

  if (dismissed) return null;

  // iOS Safari — not installed as PWA yet: show "Add to Home Screen" instructions
  if (needsInstall) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Get push notifications
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Install this app to your home screen to receive instant booking alerts:
              </p>
              <ol className="text-xs text-blue-700 mt-2 space-y-1.5 list-none pl-0">
                <li className="flex items-center gap-2">
                  <span className="bg-blue-200 text-blue-800 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <span>Tap the <Share className="w-3.5 h-3.5 inline -mt-0.5" /> <strong>Share</strong> button in Safari</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-blue-200 text-blue-800 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <span>Scroll down and tap <Plus className="w-3.5 h-3.5 inline -mt-0.5" /> <strong>Add to Home Screen</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-blue-200 text-blue-800 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <span>Open the app from your home screen & enable notifications</span>
                </li>
              </ol>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 text-blue-400 hover:text-blue-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Not supported and not iOS install case — nothing to show
  if (!supported) return null;

  // Permission was denied — nothing we can do
  if (getPushPermission() === 'denied') return null;

  // Already subscribed — show a subtle toggle
  if (subscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800">Push notifications enabled</p>
        </div>
        <button
          onClick={handleUnsubscribe}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-green-700 hover:text-red-600 disabled:opacity-50"
        >
          {loading ? '...' : 'Disable'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-orange-500" />
        <div>
          <p className="text-sm font-medium text-orange-800">Enable push notifications</p>
          <p className="text-xs text-orange-600">Get instant alerts for bookings & updates</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Enabling...' : 'Enable'}
        </button>
        <button onClick={handleDismiss} className="p-1 text-orange-400 hover:text-orange-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
