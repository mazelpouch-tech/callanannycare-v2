import { useState, useEffect } from "react";
import { Navigate, Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Bell,
  UserCircle,
  LogOut,
  Menu,
} from "lucide-react";
import { useData } from "../../context/DataContext";

const sidebarLinks = [
  { to: "/nanny", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/nanny/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/nanny/bookings", label: "My Bookings", icon: ClipboardList },
  { to: "/nanny/notifications", label: "Notifications", icon: Bell },
  { to: "/nanny/profile", label: "My Profile", icon: UserCircle },
];

export default function NannyLayout() {
  const { isNanny, nannyProfile, nannyLogout, unreadNotifications, fetchNannyNotifications } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if nanny has been blocked since login
  useEffect(() => {
    if (isNanny && nannyProfile?.status === "blocked") {
      nannyLogout();
    }
  }, [isNanny, nannyProfile?.status, nannyLogout]);
  useEffect(() => {
    if (!isNanny) return;
    const interval = setInterval(() => {
      fetchNannyNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, [isNanny, fetchNannyNotifications]);

  if (!isNanny) return <Navigate to="/nanny/login" replace />;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-card border-r border-border flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 w-10 h-10 rounded-full flex items-center justify-center">
              {nannyProfile?.image ? (
                <img
                  src={nannyProfile.image}
                  alt={nannyProfile.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <UserCircle className="w-6 h-6 text-accent" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground text-sm truncate">
                {nannyProfile?.name || "Nanny"}
              </h2>
              <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                Nanny Portal
              </span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-accent/10 text-accent shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{link.label}</span>
                {link.icon === Bell && unreadNotifications > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <button
            onClick={nannyLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted/50"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {unreadNotifications > 0 && (
              <NavLink
                to="/nanny/notifications"
                className="relative p-2 rounded-lg hover:bg-muted/50"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
              </NavLink>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {nannyProfile?.name}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
