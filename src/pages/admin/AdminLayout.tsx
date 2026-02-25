import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Users,
  ShieldCheck,
  QrCode,
  FileText,
  ScrollText,
  MessageCircle,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  User,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import AdminToast, { type AdminToastItem } from "../../components/AdminToast";
import type { LucideIcon } from "lucide-react";
import type { Booking } from "@/types";

interface SidebarLink {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const sidebarLinks: SidebarLink[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/admin/invoices", label: "Invoices", icon: FileText },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarRange },
  { to: "/admin/nannies", label: "Nannies", icon: Users },
  { to: "/admin/users", label: "Admin Users", icon: ShieldCheck },
  { to: "/admin/qr-codes", label: "QR Codes", icon: QrCode },
  { to: "/admin/login-logs", label: "Login Logs", icon: ScrollText },
  { to: "/admin/messages", label: "Messages", icon: MessageCircle },
];

export default function AdminLayout() {
  const { isAdmin, adminProfile, adminLogout, stats, bookings, unreadChatCount } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [toasts, setToasts] = useState<AdminToastItem[]>([]);
  const prevBookingsRef = useRef<Map<number | string, Booking> | null>(null);
  const dismissedIds = useRef(new Set<string>());
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownOpen]);

  // Detect booking changes and create toasts
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;

    const currentMap = new Map(bookings.map((b) => [b.id, b]));

    if (prevBookingsRef.current !== null) {
      const prev = prevBookingsRef.current;
      const newToasts: AdminToastItem[] = [];

      for (const [id, booking] of currentMap) {
        const prevBooking = prev.get(id);

        if (!prevBooking) {
          // New booking appeared
          const toastId = `new-${id}-${Date.now()}`;
          if (!dismissedIds.current.has(toastId)) {
            newToasts.push({
              id: toastId,
              message: `New booking #${id}`,
              detail: `From ${booking.clientName} · ${booking.date}`,
              type: "new_booking",
              timestamp: Date.now(),
            });
          }
        } else if (prevBooking.status === "pending" && booking.status === "confirmed") {
          // Nanny confirmed a booking
          const toastId = `confirmed-${id}-${Date.now()}`;
          newToasts.push({
            id: toastId,
            message: `Booking #${id} confirmed`,
            detail: `${booking.nannyName} confirmed for ${booking.clientName}`,
            type: "confirmation",
            timestamp: Date.now(),
          });
        } else if (booking.status === "cancelled" && prevBooking.status !== "cancelled") {
          // Booking cancelled
          const toastId = `cancelled-${id}-${Date.now()}`;
          newToasts.push({
            id: toastId,
            message: `Booking #${id} cancelled`,
            detail: booking.clientName,
            type: "cancelled",
            timestamp: Date.now(),
          });
        }
      }

      if (newToasts.length > 0) {
        setToasts((prev) => [...newToasts.slice(0, 3), ...prev].slice(0, 5));
      }
    }

    prevBookingsRef.current = currentMap;
  }, [bookings]);

  const handleDismissToast = useCallback((id: string) => {
    dismissedIds.current.add(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check for critical pending bookings (> 3 hours old)
  const hasCriticalPending = bookings.some((b) => {
    if (b.status !== "pending") return false;
    const hoursElapsed = (Date.now() - new Date(b.createdAt).getTime()) / 3600000;
    return hoursElapsed > 3;
  });

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px] bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="call a nanny" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-serif text-lg font-bold text-foreground leading-tight">
                call a nanny
              </h1>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-0.5">
                Admin Panel
              </span>
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
              {label === "Bookings" && (stats?.pendingBookings || 0) > 0 && (
                <span className={`ml-auto text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                  hasCriticalPending ? "bg-red-500 animate-pulse" : "bg-orange-500"
                }`}>
                  {stats?.pendingBookings && stats.pendingBookings > 9 ? "9+" : stats?.pendingBookings}
                </span>
              )}
              {label === "Messages" && unreadChatCount > 0 && (
                <span className="ml-auto bg-accent text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadChatCount > 9 ? "9+" : unreadChatCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={adminLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 lg:px-8 py-3 flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb / Back area */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronLeft className="w-4 h-4 hidden" />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Admin badge – clickable with dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full hover:bg-muted/60 px-1.5 py-1 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 gradient-warm rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {adminProfile?.name?.charAt(0)?.toUpperCase() || "A"}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                {adminProfile?.name || "Admin"}
              </span>
            </button>

            {/* Profile dropdown */}
            {profileDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl shadow-lg border border-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Profile info header */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {adminProfile?.name || "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {adminProfile?.email || "admin@callanannycare.com"}
                  </p>
                </div>

                {/* Profile link */}
                <NavLink
                  to="/admin/users"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>My Profile</span>
                </NavLink>

                {/* Divider */}
                <div className="border-t border-border my-1" />

                {/* Log out */}
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    adminLogout();
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Toast Notifications */}
        <AdminToast toasts={toasts} onDismiss={handleDismissToast} />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
