import { useState, useEffect } from "react";
import { Outlet, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Users,
  ShieldCheck,
  QrCode,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import type { LucideIcon } from "lucide-react";

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
];

export default function AdminLayout() {
  const { isAdmin, adminProfile, adminLogout, stats } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prevPending, setPrevPending] = useState(0);
  const [, setNewBookingAlert] = useState(false);

  // Track new pending bookings for notification badge
  useEffect(() => {
    const pending = stats?.pendingBookings || 0;
    if (pending > prevPending && prevPending > 0) {
      setNewBookingAlert(true);
      setTimeout(() => setNewBookingAlert(false), 5000);
    }
    setPrevPending(pending);
  }, [stats?.pendingBookings]);

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
            <div className="w-9 h-9 gradient-warm rounded-lg flex items-center justify-center shadow-warm">
              <span className="text-white font-bold text-sm">CN</span>
            </div>
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
                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {stats.pendingBookings > 9 ? "9+" : stats.pendingBookings}
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

          {/* Admin badge */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-warm rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {adminProfile?.name?.charAt(0)?.toUpperCase() || "A"}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              {adminProfile?.name || "Admin"}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
