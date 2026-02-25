import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
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

export default function PushNotificationBanner({ userType, userId }: Props) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const isSupp = isPushSupported();
      setSupported(isSupp);
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

  // Don't show if not supported, already subscribed, dismissed, or permission denied
  if (!supported || dismissed || getPushPermission() === 'denied') return null;

  // On iOS, only show if installed as PWA
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && !isInstalledPWA()) return null;

  // If already subscribed, show a subtle toggle
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
