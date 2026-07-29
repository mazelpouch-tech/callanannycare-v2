import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Handshake,
  CalendarDays,
  Clock,
  TrendingUp,
  Search,
  QrCode,
  ExternalLink,
  Baby,
  Hotel,
  Phone,
  Mail,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { PARTNERS, getBookingPartner } from "../../data/partners";
import type { Booking, BookingStatus } from "@/types";

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
};

const statusFilters = ["all", "pending", "confirmed", "completed", "cancelled"] as const;

function formatBookingDate(date: string): string {
  try {
    return format(parseISO(date), "EEE, MMM d, yyyy");
  } catch {
    return date;
  }
}

/** Admin page: reads the partner from the /admin/partners/:slug route */
export default function AdminPartnerBookings() {
  const { slug } = useParams<{ slug: string }>();
  return <PartnerBookingsView slug={slug} />;
}

/** Partner-scoped bookings view — also used by the standalone partner portal.
 *  mode "partner" hides links into the internal admin pages. */
export function PartnerBookingsView({ slug, mode = "admin" }: { slug: string | undefined; mode?: "admin" | "partner" }) {
  const { bookings } = useData();
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [search, setSearch] = useState("");

  const partner = slug ? PARTNERS[slug] : undefined;

  const partnerBookings = useMemo(() => {
    if (!partner) return [];
    return bookings
      .filter((b) => getBookingPartner(b.notes)?.slug === partner.slug)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [bookings, partner]);

  const visibleBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return partnerBookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.clientName.toLowerCase().includes(q) ||
        b.clientEmail.toLowerCase().includes(q) ||
        b.hotel.toLowerCase().includes(q) ||
        String(b.id).includes(q)
      );
    });
  }, [partnerBookings, statusFilter, search]);

  const stats = useMemo(() => {
    const active = partnerBookings.filter((b) => b.status !== "cancelled");
    return {
      total: partnerBookings.length,
      pending: partnerBookings.filter((b) => b.status === "pending").length,
      confirmed: partnerBookings.filter((b) => b.status === "confirmed").length,
      revenue: active.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0),
    };
  }, [partnerBookings]);

  if (!partner) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <p className="text-muted-foreground">Unknown partner portal.</p>
      </div>
    );
  }

  const portalUrl = `${window.location.origin}/book/${partner.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground">{partner.name}</h1>
              <p className="text-muted-foreground text-sm">
                Bookings made through the {partner.name} portal · {partner.rate}€/hr
                {partner.taxiFee > 0 ? ` + ${partner.taxiFee}€ night taxi fee` : " · no night taxi fee"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Portal
          </a>
          {mode === "admin" && (
            <Link
              to="/admin/qr-codes"
              className="inline-flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <CalendarDays className="w-4 h-4" />
            Total Bookings
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Clock className="w-4 h-4" />
            Pending
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <CalendarDays className="w-4 h-4" />
            Confirmed
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Revenue
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.revenue}€</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, email, hotel, or booking #"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                statusFilter === f
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Booking list */}
      {visibleBookings.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <Handshake className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">
            {partnerBookings.length === 0
              ? `No ${partner.name} bookings yet`
              : "No bookings match your filters"}
          </p>
          {partnerBookings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Bookings made through {portalUrl} will appear here automatically.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleBookings.map((booking: Booking) => {
            const status = statusConfig[booking.status] || statusConfig.pending;
            return (
              <div
                key={booking.id}
                className="bg-card rounded-2xl border border-border p-5 flex flex-wrap gap-4 items-start justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-foreground">{booking.clientName}</span>
                    <span className="text-xs text-muted-foreground">#{booking.id}</span>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatBookingDate(booking.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {booking.startTime} – {booking.endTime}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Baby className="w-3.5 h-3.5" />
                      {booking.childrenCount} {booking.childrenCount === 1 ? "child" : "children"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <Hotel className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{booking.hotel}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {booking.clientPhone}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {booking.clientEmail}
                    </span>
                  </div>
                  {booking.nannyName && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Nanny: <span className="text-foreground font-medium">{booking.nannyName}</span>
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-foreground">{booking.totalPrice}€</p>
                  {mode === "admin" && (
                    <Link
                      to="/admin/bookings"
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Manage in Bookings
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
