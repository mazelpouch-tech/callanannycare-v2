import { Navigate, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useData } from "../../context/DataContext";
import { PARTNERS } from "../../data/partners";
import { PartnerBookingsView } from "../admin/AdminPartnerBookings";

/**
 * Standalone portal for partner accounts (role 'partner').
 * Shows only the bookings belonging to the partner the account is linked to.
 */
export default function PartnerPortal() {
  const { isAdmin, adminProfile, adminLogout } = useData();
  const navigate = useNavigate();

  if (!isAdmin || adminProfile?.role !== "partner") {
    return <Navigate to="/admin/login" replace />;
  }

  const partner = adminProfile.partnerSlug ? PARTNERS[adminProfile.partnerSlug] : undefined;

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-serif font-bold text-foreground leading-tight">call a nanny</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">
                Partner Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {adminProfile.name}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {partner ? (
          <PartnerBookingsView slug={partner.slug} mode="partner" />
        ) : (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <p className="text-foreground font-medium mb-1">
              Your account is not linked to a partner yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the Call a Nanny team to finish setting up your access.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
