import { useState, useEffect, useRef } from "react";
import { Navigate, Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Bell,
  UserCircle,
  LogOut,
  Menu,
  Globe,
  User,
  MessageCircle,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";
import PushNotificationBanner from "../../components/PushNotificationBanner";

const sidebarLinks = [
  { to: "/nanny", labelKey: "nanny.layout.dashboard", icon: LayoutDashboard, end: true },
  { to: "/nanny/calendar", labelKey: "nanny.layout.calendar", icon: CalendarDays },
  { to: "/nanny/bookings", labelKey: "nanny.layout.myBookings", icon: ClipboardList },
  { to: "/nanny/notifications", labelKey: "nanny.layout.notifications", icon: Bell },
  { to: "/nanny/profile", labelKey: "nanny.layout.myProfile", icon: UserCircle },
  { to: "/nanny/messages", labelKey: "nanny.layout.messages", icon: MessageCircle },
];

export default function NannyLayout() {
  const { isNanny, nannyProfile, nannyLogout, unreadNotifications, fetchNannyNotifications, unreadChatCount } = useData();
  const { t, locale, setLocale } = useLanguage();
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
        {/* Sidebar brand */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="call a nanny" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-serif text-lg font-bold text-foreground leading-tight">
                call a nanny
              </h1>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full mt-0.5">
                {t("nanny.layout.nannyPortal")}
              </span>
            </div>
          </div>
        </div>

        {/* Nanny profile */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              {nannyProfile?.image ? (
                <img
                  src={nannyProfile.image}
                  alt={nannyProfile.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <UserCircle className="w-5 h-5 text-accent" />
              )}
            </div>
            <span className="font-medium text-foreground text-sm truncate">
              {nannyProfile?.name || "Nanny"}
            </span>
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
                <span>{t(link.labelKey)}</span>
                {link.icon === Bell && unreadNotifications > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
                {link.icon === MessageCircle && unreadChatCount > 0 && (
                  <span className="ml-auto bg-accent text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
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
            <span>{t("nanny.layout.signOut")}</span>
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
            <button
              onClick={() => setLocale(locale === "en" ? "fr" : "en")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 text-sm font-medium text-muted-foreground transition-colors"
            >
              <Globe className="w-4 h-4" />
              {locale === "en" ? "FR" : "EN"}
            </button>
            {unreadNotifications > 0 && (
              <NavLink
                to="/nanny/notifications"
                className="relative p-2 rounded-lg hover:bg-muted/50"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
              </NavLink>
            )}

            {/* Nanny avatar – clickable with dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full hover:bg-muted/60 px-1.5 py-1 transition-colors cursor-pointer"
              >
                <div className="bg-accent/10 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                  {nannyProfile?.image ? (
                    <img
                      src={nannyProfile.image}
                      alt={nannyProfile.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-accent text-xs font-bold">
                      {nannyProfile?.name?.charAt(0)?.toUpperCase() || "N"}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:inline">
                  {nannyProfile?.name || "Nanny"}
                </span>
              </button>

              {/* Profile dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl shadow-lg border border-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Profile info header */}
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {nannyProfile?.name || "Nanny"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {nannyProfile?.email || ""}
                    </p>
                  </div>

                  {/* Profile link */}
                  <NavLink
                    to="/nanny/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{t("nanny.layout.myProfile")}</span>
                  </NavLink>

                  {/* Divider */}
                  <div className="border-t border-border my-1" />

                  {/* Log out */}
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      nannyLogout();
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t("nanny.layout.signOut")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {nannyProfile && (
            <PushNotificationBanner userType="nanny" userId={nannyProfile.id} />
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
