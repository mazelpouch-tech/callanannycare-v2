import { useState, useMemo } from "react";
import {
  Users, CalendarDays, Phone, MessageCircle,
  Hotel, Clock, User, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, UserCheck, UserX,
  DollarSign, X,
} from "lucide-react";
import { parseISO, isToday, addDays, isBefore, isAfter } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { Booking, Nanny } from "@/types";

type ViewMode = "today" | "week";

interface NannyGroup {
  nanny: Nanny;
  bookings: Booking[];
  totalAmount: number;
}

export default function SupervisorAssignments() {
  const { bookings, nannies, bulkUpdateNannyRate, adminProfile } = useData();
  const { toDH } = useExchangeRate();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [expandedNanny, setExpandedNanny] = useState<number | null>(null);

  // Bulk rate state
  const [bulkRateModalOpen, setBulkRateModalOpen] = useState(false);
  const [bulkRateValue, setBulkRateValue] = useState("");
  const [bulkRateLoading, setBulkRateLoading] = useState(false);
  const [bulkRateError, setBulkRateError] = useState("");
  const [bulkRateSuccess, setBulkRateSuccess] = useState("");

  const handleBulkRateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const rate = Number(bulkRateValue);
    if (!rate || rate <= 0) { setBulkRateError("Please enter a valid positive rate."); return; }
    setBulkRateLoading(true);
    setBulkRateError("");
    const result = await bulkUpdateNannyRate(rate, {
      notifyAdmin: true,
      updatedByName: adminProfile?.name,
      updatedByEmail: adminProfile?.email,
    });
    setBulkRateLoading(false);
    if (result.success) {
      setBulkRateSuccess(`Rate updated to ${rate} €/hr for ${result.nannyCount} nannies. Admin notified.`);
      setTimeout(() => { setBulkRateModalOpen(false); setBulkRateSuccess(""); setBulkRateValue(""); }, 2500);
    } else {
      setBulkRateError(result.error || "Failed to update rates.");
    }
  };

  const now = new Date();
  const weekEnd = addDays(now, 7);

  // Filter bookings by time range
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status === "cancelled") return false;
      try {
        const d = parseISO(b.date);
        if (viewMode === "today") return isToday(d);
        // week: from today to +7 days
        return !isBefore(d, now) && !isAfter(d, weekEnd);
      } catch { return false; }
    });
  }, [bookings, viewMode, now, weekEnd]);

  // Group bookings by nanny
  const nannyGroups = useMemo(() => {
    const map = new Map<number, Booking[]>();
    filteredBookings.forEach((b) => {
      const nannyId = b.nannyId || 0;
      if (!map.has(nannyId)) map.set(nannyId, []);
      map.get(nannyId)!.push(b);
    });

    const groups: NannyGroup[] = [];
    map.forEach((nannyBookings, nannyId) => {
      const nanny = nannies.find((n) => n.id === nannyId);
      if (!nanny) return;
      groups.push({
        nanny,
        bookings: nannyBookings.sort((a, b) => {
          const cmp = a.date.localeCompare(b.date);
          if (cmp !== 0) return cmp;
          return (a.startTime || "").localeCompare(b.startTime || "");
        }),
        totalAmount: nannyBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      });
    });
    return groups.sort((a, b) => b.bookings.length - a.bookings.length);
  }, [filteredBookings, nannies]);

  // Free nannies (active + available, no bookings in this range)
  const assignedNannyIds = new Set(nannyGroups.map((g) => g.nanny.id));
  const freeNannies = nannies.filter(
    (n) => n.status === "active" && n.available && !assignedNannyIds.has(n.id)
  );

  // Stats
  const totalBookings = filteredBookings.length;
  const confirmedCount = filteredBookings.filter((b) => b.status === "confirmed").length;
  const pendingCount = filteredBookings.filter((b) => b.status === "pending").length;
  const assignedNannies = nannyGroups.length;

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, "");
    window.open(`https://wa.me/${cleaned}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nanny Schedule</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Which nanny handles which booking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setBulkRateValue(""); setBulkRateError(""); setBulkRateSuccess(""); setBulkRateModalOpen(true); }}
            className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 text-sm"
          >
            <DollarSign className="w-4 h-4" />
            Set All Rates
          </button>

          {/* Toggle */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setViewMode("today")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "today"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "week"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            This Week
          </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Bookings</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{assignedNannies}</p>
          <p className="text-xs text-muted-foreground mt-1">Nannies Assigned</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </div>
      </div>

      {/* Nanny Groups */}
      {nannyGroups.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            No bookings {viewMode === "today" ? "today" : "this week"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            All nannies are free
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {nannyGroups.map((group) => {
            const isExpanded = expandedNanny === group.nanny.id;
            return (
              <div key={group.nanny.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Nanny Header */}
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedNanny(isExpanded ? null : group.nanny.id)}
                >
                  <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    {group.nanny.image ? (
                      <img src={group.nanny.image} alt={group.nanny.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-violet-700 font-bold text-lg">{group.nanny.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground">{group.nanny.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.bookings.length} booking{group.bookings.length !== 1 ? "s" : ""} · {group.totalAmount}€ ({toDH(group.totalAmount)} DH)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Nanny quick contact */}
                    {group.nanny.phone && (
                      <>
                        <a
                          href={`tel:${group.nanny.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title={`Call ${group.nanny.name}`}
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); openWhatsApp(group.nanny.phone); }}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                          title={`WhatsApp ${group.nanny.name}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </div>

                {/* Bookings List (expanded) */}
                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {group.bookings.map((b) => (
                      <div key={b.id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {/* Status indicator */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            b.status === "confirmed" ? "bg-green-50" : b.status === "pending" ? "bg-orange-50" : "bg-gray-50"
                          }`}>
                            {b.status === "confirmed" ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : b.status === "pending" ? (
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            ) : (
                              <CalendarDays className="w-4 h-4 text-gray-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{b.clientName}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                b.status === "confirmed"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : b.status === "pending"
                                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                                  : "bg-gray-50 text-gray-700 border border-gray-200"
                              }`}>
                                {b.status}
                              </span>
                              {b.collectedAt && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Collected
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {b.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {b.startTime}–{b.endTime}
                              </span>
                              <span className="font-semibold text-foreground">{b.totalPrice}€</span>
                            </div>

                            {b.hotel && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Hotel className="w-3 h-3" />
                                {b.hotel}
                              </div>
                            )}

                            {b.childrenCount > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {b.childrenCount} child{b.childrenCount !== 1 ? "ren" : ""} ({b.childrenAges || "ages n/a"})
                              </div>
                            )}
                          </div>

                          {/* Parent contact */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {b.clientPhone && (
                              <>
                                <a
                                  href={`tel:${b.clientPhone}`}
                                  className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                                  title={`Call ${b.clientName}`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => openWhatsApp(b.clientPhone)}
                                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                  title={`WhatsApp ${b.clientName}`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Free Nannies */}
      {freeNannies.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              Available Nannies ({freeNannies.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              No bookings {viewMode === "today" ? "today" : "this week"}
            </p>
          </div>
          <div className="divide-y divide-border">
            {freeNannies.map((n) => (
              <div key={n.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  {n.image ? (
                    <img src={n.image} alt={n.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-green-700 font-bold text-sm">{n.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.name}</p>
                  <p className="text-xs text-muted-foreground">{n.location}</p>
                </div>
                {n.phone && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${n.phone}`}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title={`Call ${n.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => openWhatsApp(n.phone)}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      title={`WhatsApp ${n.name}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unavailable Nannies */}
      {nannies.filter((n) => n.status === "active" && !n.available).length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-400" />
              Unavailable ({nannies.filter((n) => n.status === "active" && !n.available).length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {nannies.filter((n) => n.status === "active" && !n.available).map((n) => (
              <div key={n.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <span className="text-red-700 font-bold text-sm">{n.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.name}</p>
                  <p className="text-xs text-muted-foreground">{n.location}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                  Unavailable
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Rate Modal */}
      {bulkRateModalOpen && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="font-serif text-lg font-bold text-foreground">Set All Nanny Rates</h2>
              </div>
              <button onClick={() => setBulkRateModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              This will update the hourly rate for all <strong>active</strong> and <strong>invited</strong> nannies.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              The main admin will be notified by email when you apply this change.
            </p>
            <form onSubmit={handleBulkRateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Hourly Rate (€/hr)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={bulkRateValue}
                  onChange={(e) => setBulkRateValue(e.target.value)}
                  placeholder="e.g. 150"
                  required
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
              {bulkRateError && <p className="text-sm text-destructive">{bulkRateError}</p>}
              {bulkRateSuccess && <p className="text-sm text-emerald-600 font-medium">{bulkRateSuccess}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={bulkRateLoading}
                  className="flex-1 bg-emerald-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bulkRateLoading ? "Updating..." : "Apply to All"}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkRateModalOpen(false)}
                  className="flex-1 bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
