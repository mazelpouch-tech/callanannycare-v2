import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Calendar, Clock, User, Mail, Phone, Hotel,
  ChevronDown, ChevronUp, Baby, X,
} from "lucide-react";
import { format } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { BookingStatus } from "@/types";

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-orange-50 text-orange-700 border border-orange-200" },
  confirmed: { label: "Confirmed", className: "bg-green-50 text-green-700 border border-green-200" },
  completed: { label: "Completed", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border border-red-200" },
};

type TabKey = "new" | "previous" | "all";

export default function SupervisorBookings() {
  const { bookings, nannies } = useData();
  const { toDH } = useExchangeRate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [nannyFilter, setNannyFilter] = useState<string>("all");
  const [tab, setTab] = useState<TabKey>(searchParams.get("status") === "pending" ? "new" : "all");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  // Separate new (upcoming/pending/confirmed) vs previous (completed/cancelled/past)
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Tab filter
    if (tab === "new") {
      filtered = filtered.filter((b) => b.status === "pending" || b.status === "confirmed");
    } else if (tab === "previous") {
      filtered = filtered.filter((b) => b.status === "completed" || b.status === "cancelled");
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Nanny filter
    if (nannyFilter !== "all") {
      filtered = filtered.filter((b) => String(b.nannyId) === nannyFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.clientName?.toLowerCase().includes(q) ||
          b.clientEmail?.toLowerCase().includes(q) ||
          b.clientPhone?.toLowerCase().includes(q) ||
          b.nannyName?.toLowerCase().includes(q) ||
          b.hotel?.toLowerCase().includes(q) ||
          String(b.id).includes(q)
      );
    }

    // Sort: newest first
    return filtered.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [bookings, tab, statusFilter, nannyFilter, search]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All Bookings", count: bookings.length },
    { key: "new", label: "New / Active", count: bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length },
    { key: "previous", label: "Previous", count: bookings.filter((b) => b.status === "completed" || b.status === "cancelled").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bookings Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View all bookings across all nannies
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setStatusFilter("all"); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              tab === t.key ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, nanny, hotel, or booking #..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={nannyFilter}
          onChange={(e) => setNannyFilter(e.target.value)}
          className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        >
          <option value="all">All Nannies</option>
          {nannies.filter((n) => n.status === "active").map((n) => (
            <option key={n.id} value={String(n.id)}>{n.name}</option>
          ))}
        </select>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No bookings found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-sm transition-shadow"
            >
              {/* Booking Row */}
              <div
                className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
              >
                {/* Nanny avatar */}
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {booking.nannyImage ? (
                    <img src={booking.nannyImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-violet-700 text-sm font-bold">
                      {booking.nannyName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      #{booking.id} · {booking.clientName}
                    </p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig[booking.status].className}`}>
                      {statusConfig[booking.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {booking.nannyName} · {booking.date} · {booking.startTime}–{booking.endTime}
                  </p>
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{booking.totalPrice}€</p>
                  <p className="text-[10px] text-muted-foreground">{toDH(booking.totalPrice)} DH</p>
                </div>

                {/* Expand */}
                <div className="shrink-0">
                  {expandedId === booking.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === booking.id && (
                <div className="px-5 pb-5 pt-0 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {/* Client Info */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Info</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{booking.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <a href={`mailto:${booking.clientEmail}`} className="text-violet-600 hover:underline">{booking.clientEmail}</a>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <a href={`tel:${booking.clientPhone}`} className="text-violet-600 hover:underline">{booking.clientPhone || "N/A"}</a>
                      </div>
                      {booking.hotel && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hotel className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-foreground">{booking.hotel}</span>
                        </div>
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Details</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">
                          {booking.date}{booking.endDate && booking.endDate !== booking.date ? ` → ${booking.endDate}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{booking.startTime} – {booking.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Baby className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">
                          {booking.childrenCount} {booking.childrenCount === 1 ? "child" : "children"}
                          {booking.childrenAges ? ` (${booking.childrenAges})` : ""}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Plan: </span>
                        <span className="text-foreground capitalize">{booking.plan}</span>
                      </div>
                    </div>

                    {/* Nanny & Payment */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nanny & Payment</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground font-medium">{booking.nannyName}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Price: </span>
                        <span className="text-foreground font-semibold">{booking.totalPrice}€</span>
                        <span className="text-muted-foreground ml-1">({toDH(booking.totalPrice)} DH)</span>
                      </div>
                      {booking.clockIn && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Clock in: </span>
                          <span className="text-foreground">{format(new Date(booking.clockIn), "HH:mm")}</span>
                        </div>
                      )}
                      {booking.clockOut && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Clock out: </span>
                          <span className="text-foreground">{format(new Date(booking.clockOut), "HH:mm")}</span>
                        </div>
                      )}
                      {booking.createdBy && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Created by: </span>
                          <span className="text-foreground capitalize">{booking.createdBy}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {booking.notes && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-sm text-foreground">{booking.notes}</p>
                    </div>
                  )}

                  {/* Cancellation info */}
                  {booking.status === "cancelled" && booking.cancellationReason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Cancellation Reason</p>
                      <p className="text-sm text-red-700">{booking.cancellationReason}</p>
                      {booking.cancelledBy && (
                        <p className="text-xs text-red-600 mt-1">Cancelled by: {booking.cancelledBy}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {filteredBookings.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
          </p>
          <p className="text-sm font-semibold text-foreground">
            Total: {filteredBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)}€
          </p>
        </div>
      )}
    </div>
  );
}
