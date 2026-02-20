import { useEffect } from "react";
import {
  CalendarPlus,
  CheckCircle,
  XCircle,
  Award,
  BellOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useData } from "../../context/DataContext";

const typeConfig = {
  new_booking: {
    icon: CalendarPlus,
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-l-orange-400",
  },
  booking_confirmed: {
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-50",
    border: "border-l-green-400",
  },
  booking_cancelled: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-l-red-400",
  },
  booking_completed: {
    icon: Award,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-l-blue-400",
  },
};

export default function NannyNotifications() {
  const {
    nannyNotifications,
    fetchNannyNotifications,
    markNotificationsRead,
    unreadNotifications,
  } = useData();

  useEffect(() => {
    fetchNannyNotifications();
  }, [fetchNannyNotifications]);

  const handleMarkAllRead = () => {
    const unreadIds = nannyNotifications
      .filter((n) => !n.isRead)
      .map((n) => n.id);
    if (unreadIds.length > 0) {
      markNotificationsRead(unreadIds);
    }
  };

  const handleMarkRead = (id: number) => {
    markNotificationsRead([id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadNotifications > 0
              ? `You have ${unreadNotifications} unread notification${
                  unreadNotifications !== 1 ? "s" : ""
                }`
              : "You're all caught up"}
          </p>
        </div>
        {unreadNotifications > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-accent hover:underline font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border">
        {nannyNotifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <BellOff className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No notifications yet</p>
            <p className="text-sm">
              You'll be notified when you receive new bookings or updates.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {nannyNotifications.map((notification) => {
              const config = typeConfig[notification.type] || typeConfig.new_booking;
              const Icon = config.icon;
              const timeAgo = (() => {
                try {
                  return formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  });
                } catch {
                  return "";
                }
              })();

              return (
                <div
                  key={notification.id}
                  onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                  className={`p-4 sm:p-5 flex gap-4 cursor-pointer transition-colors border-l-4 ${
                    config.border
                  } ${
                    notification.isRead
                      ? "bg-card opacity-70"
                      : "bg-accent/5 hover:bg-accent/10"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-sm font-semibold ${
                          notification.isRead
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-2.5 h-2.5 bg-accent rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {timeAgo}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
