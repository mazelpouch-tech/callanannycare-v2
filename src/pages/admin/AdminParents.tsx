import { useState, useMemo, Fragment } from "react";
import {
  Search,
  Users,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CircleDashed,
  X,
  Banknote,
  CreditCard,
  Wallet,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { calcTotalBookedHours } from "@/utils/shiftHelpers";
import type { Booking } from "@/types";

interface ParentSummary {
  key: string;
  name: string;
  email: string;
  phone: string;
  hotel: string;
  totalBookings: number;
  totalHours: number;
  totalPrice: number;
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
  nannyNames: string[];
  lastBookingDate: string;
  bookings: Booking[];
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  confirmed: { label: "Confirmed", cls: "bg-green-50 text-green-700 border border-green-200" },
  completed: { label: "Completed", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-700 border border-red-200" },
};

function hoursForBooking(b: Booking): number {
  if (!b.startTime || !b.endTime) return 0;
  return calcTotalBookedHours(b.startTime, b.endTime, b.extraTimes, b.date, b.endDate);
}

export default function AdminParents() {
  const { bookings, markAsCollected, adminProfile } = useData();
  const { toDH } = useExchangeRate();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spent" | "bookings" | "recent" | "hours">("spent");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  // Collection modal state (single booking OR bulk parent)
  const [collectingBooking, setCollectingBooking] = useState<Booking | null>(null);
  const [collectingParent, setCollectingParent] = useState<ParentSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [collectionNote, setCollectionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const closeModal = () => {
    setCollectingBooking(null);
    setCollectingParent(null);
    setPaymentMethod("cash");
    setCollectionNote("");
    setBulkProgress(0);
  };

  // Single booking collection
  const handleCollect = async () => {
    if (!collectingBooking) return;
    setIsSubmitting(true);
    try {
      await markAsCollected(collectingBooking.id, {
        collectedBy: adminProfile?.name || "Admin",
        paymentMethod,
        collectionNote: collectionNote.trim() || undefined,
      });
      closeModal();
    } catch (err) {
      console.error("Collection failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk collection for all unpaid bookings of a parent
  const handleBulkCollect = async () => {
    if (!collectingParent) return;
    const unpaid = collectingParent.bookings.filter((b) => b.status !== "cancelled" && !b.collectedAt);
    if (unpaid.length === 0) return;
    setIsSubmitting(true);
    setBulkProgress(0);
    try {
      for (let i = 0; i < unpaid.length; i++) {
        await markAsCollected(unpaid[i].id, {
          collectedBy: adminProfile?.name || "Admin",
          paymentMethod,
          collectionNote: collectionNote.trim() || undefined,
        });
        setBulkProgress(i + 1);
      }
      closeModal();
    } catch (err) {
      console.error("Bulk collection failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group bookings by parent
  const parents = useMemo(() => {
    const map = new Map<string, ParentSummary>();

    bookings.forEach((b) => {
      const key = `${(b.clientName || "").trim().toLowerCase()}|${(b.clientEmail || "").trim().toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: b.clientName || "Unknown",
          email: b.clientEmail || "",
          phone: b.clientPhone || "",
          hotel: b.hotel || "",
          totalBookings: 0,
          totalHours: 0,
          totalPrice: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          paidCount: 0,
          unpaidCount: 0,
          nannyNames: [],
          lastBookingDate: "",
          bookings: [],
        });
      }

      const parent = map.get(key)!;
      parent.bookings.push(b);

      if (!parent.lastBookingDate || b.date > parent.lastBookingDate) {
        parent.lastBookingDate = b.date;
        parent.hotel = b.hotel || parent.hotel;
        parent.phone = b.clientPhone || parent.phone;
        parent.name = b.clientName || parent.name;
      }

      if (b.status !== "cancelled") {
        parent.totalBookings++;
        parent.totalPrice += b.totalPrice || 0;
        parent.totalHours += hoursForBooking(b);

        if (b.collectedAt) {
          parent.paidAmount += b.totalPrice || 0;
          parent.paidCount++;
        } else {
          parent.unpaidAmount += b.totalPrice || 0;
          parent.unpaidCount++;
        }
      }

      if (b.nannyName && !parent.nannyNames.includes(b.nannyName)) {
        parent.nannyNames.push(b.nannyName);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalPrice - a.totalPrice);
  }, [bookings]);

  // Filter + sort
  const filteredParents = useMemo(() => {
    let result = parents;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          p.hotel.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "bookings":
        return [...result].sort((a, b) => b.totalBookings - a.totalBookings);
      case "recent":
        return [...result].sort((a, b) => (b.lastBookingDate || "").localeCompare(a.lastBookingDate || ""));
      case "hours":
        return [...result].sort((a, b) => b.totalHours - a.totalHours);
      default:
        return result;
    }
  }, [parents, search, sortBy]);

  // Totals for stat cards
  const totalHours = filteredParents.reduce((s, p) => s + p.totalHours, 0);
  const totalRevenue = filteredParents.reduce((s, p) => s + p.totalPrice, 0);
  const totalPaid = filteredParents.reduce((s, p) => s + p.paidAmount, 0);
  const totalUnpaid = filteredParents.reduce((s, p) => s + p.unpaidAmount, 0);

  const toggle = (key: string) => setExpandedParent(expandedParent === key ? null : key);

  // Render expanded booking history
  const renderHistory = (p: ParentSummary) => {
    const sorted = [...p.bookings].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return sorted.map((b) => {
      const hours = hoursForBooking(b);
      const st = statusConfig[b.status] || statusConfig.pending;
      const isPaid = !!b.collectedAt;
      const isCancelled = b.status === "cancelled";
      return (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-xs border-b border-border/50 last:border-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span className="text-muted-foreground whitespace-nowrap">
              {b.date ? format(parseISO(b.date), "dd MMM yy") : "—"}
            </span>
            <span className="text-foreground whitespace-nowrap">{b.startTime} – {b.endTime}</span>
            <span className="text-muted-foreground">{hours.toFixed(1)}h</span>
            <span className="text-foreground truncate">{b.nannyName || "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-foreground">{(b.totalPrice || 0).toLocaleString()}&euro;</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
            {!isCancelled && (
              isPaid ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-3 h-3" /> Paid
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollectingBooking(b);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <CircleDashed className="w-3 h-3" /> Collect
                </button>
              )
            )}
          </div>
        </div>
      );
    });
  };

  // Payment status badge for parent row
  const paymentBadge = (p: ParentSummary, showCollectAll = false) => {
    if (p.unpaidCount === 0 && p.paidCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle className="w-3 h-3" /> All Paid
        </span>
      );
    }
    if (p.unpaidCount > 0) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <CircleDashed className="w-3 h-3" /> {p.unpaidCount} unpaid
          </span>
          {showCollectAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollectingParent(p);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
            >
              <CheckCircle className="w-3 h-3" /> Collect All
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">Parents</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of all parents who booked</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{filteredParents.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Parents</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-blue-700" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground mt-1">Total Hours</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-purple-700" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalRevenue.toLocaleString()}&euro;</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{toDH(totalRevenue).toLocaleString()} DH</p>
          <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-green-700" />
          </div>
          <p className="text-2xl font-bold text-green-700">{totalPaid.toLocaleString()}&euro;</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{toDH(totalPaid).toLocaleString()} DH</p>
          <p className="text-xs text-muted-foreground mt-1">Collected</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft col-span-2 lg:col-span-1">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <CircleDashed className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{totalUnpaid.toLocaleString()}&euro;</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{toDH(totalUnpaid).toLocaleString()} DH</p>
          <p className="text-xs text-muted-foreground mt-1">To Collect</p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or hotel..."
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="spent">Sort: Most Spent</option>
          <option value="bookings">Sort: Most Bookings</option>
          <option value="recent">Sort: Most Recent</option>
          <option value="hours">Sort: Most Hours</option>
        </select>
      </div>

      {/* Empty state */}
      {filteredParents.length === 0 && (
        <div className="bg-card rounded-xl border border-border shadow-soft p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No parents match your search" : "No booking data yet"}
          </p>
        </div>
      )}

      {/* Desktop table */}
      {filteredParents.length > 0 && (
        <div className="hidden md:block bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["#", "Parent", "Hotel", "Bookings", "Hours", "Total Spent", "Payment", "Nannies", "Last Booking"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredParents.map((p, i) => (
                <Fragment key={p.key}>
                  <tr
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => toggle(p.key)}
                  >
                    <td className="px-5 py-3 text-sm font-bold text-muted-foreground/40">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                      {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">{p.hotel || "—"}</td>
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{p.totalBookings}</td>
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{p.totalHours.toFixed(1)}h</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-bold text-foreground">{p.totalPrice.toLocaleString()}&euro;</p>
                      <p className="text-[10px] text-muted-foreground">{toDH(p.totalPrice).toLocaleString()} DH</p>
                    </td>
                    <td className="px-5 py-3">
                      {paymentBadge(p, true)}
                      {p.unpaidCount > 0 && p.paidCount > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">{p.paidCount} paid · {p.unpaidCount} unpaid</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{p.nannyNames.join(", ") || "—"}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {p.lastBookingDate ? format(parseISO(p.lastBookingDate), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                  {expandedParent === p.key && (
                    <tr>
                      <td colSpan={9} className="px-8 py-4 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Booking History</p>
                        {renderHistory(p)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {filteredParents.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredParents.map((p, i) => (
            <div key={p.key} className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
              <div
                className="p-4 cursor-pointer active:bg-muted/30 transition-colors"
                onClick={() => toggle(p.key)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-black text-muted-foreground/30 w-6 text-center shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      {p.email && <p className="text-xs text-muted-foreground truncate">{p.email}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{p.totalPrice.toLocaleString()}&euro;</p>
                    <p className="text-[10px] text-muted-foreground">{toDH(p.totalPrice).toLocaleString()} DH</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>{p.totalBookings} bookings</span>
                  <span>{p.totalHours.toFixed(1)}h</span>
                  {paymentBadge(p, true)}
                  {expandedParent === p.key ? (
                    <ChevronUp className="w-4 h-4 ml-auto shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-auto shrink-0" />
                  )}
                </div>
              </div>
              {expandedParent === p.key && (
                <div className="border-t border-border px-4 py-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Booking History</p>
                  {renderHistory(p)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Single booking collection modal */}
      {collectingBooking && !collectingParent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => !isSubmitting && closeModal()} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl border border-border w-full sm:max-w-md mx-auto shadow-xl z-10 max-h-[90vh] overflow-y-auto">

            <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Confirm Collection</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{collectingBooking.clientName} · {collectingBooking.date}</p>
              </div>
              <button onClick={() => !isSubmitting && closeModal()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                <p className="text-3xl font-bold text-green-700">{collectingBooking.totalPrice}&euro;</p>
                <p className="text-sm text-green-600 mt-1">{toDH(collectingBooking.totalPrice)} DH</p>
              </div>

              <div className="space-y-1 text-sm bg-muted/30 rounded-xl px-4 py-3">
                <div><span className="text-muted-foreground">Nanny: </span><span className="font-medium">{collectingBooking.nannyName}</span></div>
                <div><span className="text-muted-foreground">Date: </span><span>{collectingBooking.date} · {collectingBooking.startTime}–{collectingBooking.endTime}</span></div>
                {collectingBooking.hotel && (
                  <div><span className="text-muted-foreground">Hotel: </span><span>{collectingBooking.hotel}</span></div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "cash", label: "Cash", Icon: Banknote },
                    { value: "bank", label: "Transfer", Icon: CreditCard },
                    { value: "card", label: "Card / Tap", Icon: Wallet },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                        paymentMethod === value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-card text-muted-foreground hover:border-green-300"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  value={collectionNote}
                  onChange={(e) => setCollectionNote(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button onClick={() => !isSubmitting && closeModal()} disabled={isSubmitting} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCollect} disabled={isSubmitting} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirm Collection</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk collection modal (collect all for a parent) */}
      {collectingParent && (() => {
        const unpaid = collectingParent.bookings.filter((b) => b.status !== "cancelled" && !b.collectedAt);
        const bulkTotal = unpaid.reduce((s, b) => s + (b.totalPrice || 0), 0);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => !isSubmitting && closeModal()} />
            <div className="relative bg-card rounded-t-3xl sm:rounded-2xl border border-border w-full sm:max-w-md mx-auto shadow-xl z-10 max-h-[90vh] overflow-y-auto">

              <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Collect All Payments</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{collectingParent.name} · {unpaid.length} bookings</p>
                </div>
                <button onClick={() => !isSubmitting && closeModal()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Total amount */}
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p className="text-xs text-green-600 mb-1 font-medium">Total to collect</p>
                  <p className="text-3xl font-bold text-green-700">{bulkTotal.toLocaleString()}&euro;</p>
                  <p className="text-sm text-green-600 mt-1">{toDH(bulkTotal).toLocaleString()} DH</p>
                </div>

                {/* List of unpaid bookings */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Unpaid Bookings</label>
                  <div className="bg-muted/30 rounded-xl overflow-hidden divide-y divide-border/50">
                    {unpaid.map((b, idx) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSubmitting && bulkProgress > idx ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          ) : isSubmitting && bulkProgress === idx ? (
                            <span className="animate-spin w-3.5 h-3.5 border-2 border-green-300 border-t-green-600 rounded-full shrink-0" />
                          ) : (
                            <CircleDashed className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className="text-muted-foreground whitespace-nowrap">
                            {b.date ? format(parseISO(b.date), "dd MMM yy") : "—"}
                          </span>
                          <span className="text-foreground whitespace-nowrap">{b.startTime}–{b.endTime}</span>
                          <span className="text-foreground truncate">{b.nannyName || "—"}</span>
                        </div>
                        <span className="font-bold text-foreground shrink-0">{(b.totalPrice || 0).toLocaleString()}&euro;</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "cash", label: "Cash", Icon: Banknote },
                      { value: "bank", label: "Transfer", Icon: CreditCard },
                      { value: "card", label: "Card / Tap", Icon: Wallet },
                    ].map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === value
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-border bg-card text-muted-foreground hover:border-green-300"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <textarea
                    value={collectionNote}
                    onChange={(e) => setCollectionNote(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 flex gap-3">
                <button onClick={() => !isSubmitting && closeModal()} disabled={isSubmitting} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleBulkCollect} disabled={isSubmitting} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSubmitting ? (
                    <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> {bulkProgress}/{unpaid.length}</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Collect All ({unpaid.length})</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
