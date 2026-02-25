import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  User,
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
  { to: "/supervisor", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/supervisor/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/supervisor/revenue", label: "Revenue & Collections", icon: DollarSign },
];

export default function SupervisorLayout() {
  const { isAdmin, isSupervisor, adminProfile, adminLogout, stats } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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

  if (!isAdmin || !isSupervisor) {
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
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full mt-0.5">
                Supervisor
              </span>
            </div>
          </div>
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
                    ? "bg-violet-100 text-violet-700 shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
              {label === "Bookings" && (stats?.pendingBookings || 0) > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {stats?.pendingBookings && stats.pendingBookings > 9 ? "9+" : stats?.pendingBookings}
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
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronLeft className="w-4 h-4 hidden" />
          </div>

          <div className="flex-1" />

          {/* Profile badge */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full hover:bg-muted/60 px-1.5 py-1 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {adminProfile?.name?.charAt(0)?.toUpperCase() || "S"}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                {adminProfile?.name || "Supervisor"}
              </span>
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl shadow-lg border border-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {adminProfile?.name || "Supervisor"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {adminProfile?.email || ""}
                  </p>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full mt-1">
                    Supervisor
                  </span>
                </div>

                <div className="border-t border-border my-1" />

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

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
