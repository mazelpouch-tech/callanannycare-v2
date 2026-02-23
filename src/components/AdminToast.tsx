import { useEffect, useState } from "react";
import { CheckCircle, CalendarPlus, XCircle, X } from "lucide-react";

export interface AdminToastItem {
  id: string;
  message: string;
  detail?: string;
  type: "confirmation" | "new_booking" | "cancelled";
  timestamp: number;
}

interface AdminToastProps {
  toasts: AdminToastItem[];
  onDismiss: (id: string) => void;
}

const TOAST_DURATION = 8000;

const typeConfig = {
  confirmation: {
    icon: CheckCircle,
    bg: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    textColor: "text-green-900",
  },
  new_booking: {
    icon: CalendarPlus,
    bg: "bg-orange-50 border-orange-200",
    iconColor: "text-orange-600",
    textColor: "text-orange-900",
  },
  cancelled: {
    icon: XCircle,
    bg: "bg-red-50 border-red-200",
    iconColor: "text-red-600",
    textColor: "text-red-900",
  },
};

function ToastItem({ toast, onDismiss }: { toast: AdminToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const config = typeConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 ${config.bg} ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${config.textColor}`}>{toast.message}</p>
        {toast.detail && (
          <p className="text-xs text-muted-foreground mt-0.5">{toast.detail}</p>
        )}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 300);
        }}
        className="p-1 rounded-lg hover:bg-black/5 text-muted-foreground shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function AdminToast({ toasts, onDismiss }: AdminToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-40 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}
