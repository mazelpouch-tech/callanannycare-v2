import { useState } from "react";
import { Outlet, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { useData } from "../../context/DataContext";

const sidebarLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/admin/nannies", label: "Nannies", icon: Users },
];

export default function AdminLayout() {
  const { isAdmin, adminLogout } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
                Call a Nanny
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
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              Admin
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
