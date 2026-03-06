import { useState, useMemo, Fragment } from "react";
import {
  Search,
  Users,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
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
  const { bookings } = useData();
  const { toDH } = useExchangeRate();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spent" | "bookings" | "recent" | "hours">("spent");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

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
          nannyNames: [],
          lastBookingDate: "",
          bookings: [],
        });
      }

      const parent = map.get(key)!;
      parent.bookings.push(b);

      // Use most recent booking's info
      if (!parent.lastBookingDate || b.date > parent.lastBookingDate) {
        parent.lastBookingDate = b.date;
        parent.hotel = b.hotel || parent.hotel;
        parent.phone = b.clientPhone || parent.phone;
        parent.name = b.clientName || parent.name;
      }

      // Only count non-cancelled bookings
      if (b.status !== "cancelled") {
        parent.totalBookings++;
        parent.totalPrice += b.totalPrice || 0;
        parent.totalHours += hoursForBooking(b);
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

  const toggle = (key: string) => setExpandedParent(expandedParent === key ? null : key);

  // Render expanded booking history
  const renderHistory = (p: ParentSummary) => {
    const sorted = [...p.bookings].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return sorted.map((b) => {
      const hours = hoursForBooking(b);
      const st = statusConfig[b.status] || statusConfig.pending;
      return (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-xs border-b border-border/50 last:border-0">
          <div className="flex items-center gap-3 min-w-0">
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
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">Parents</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of all parents who booked</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Parents", value: filteredParents.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, icon: Clock, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Total Revenue", value: `${totalRevenue.toLocaleString()}\u20AC`, sub: `${toDH(totalRevenue).toLocaleString()} DH`, icon: DollarSign, color: "text-green-700", bg: "bg-green-50" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5 shadow-soft">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            {"sub" in s && s.sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</p>}
          </div>
        ))}
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
                {["#", "Parent", "Hotel", "Bookings", "Hours", "Total Spent", "Nannies", "Last Booking"].map((h) => (
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
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{p.nannyNames.join(", ") || "—"}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {p.lastBookingDate ? format(parseISO(p.lastBookingDate), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                  {expandedParent === p.key && (
                    <tr>
                      <td colSpan={8} className="px-8 py-4 bg-muted/30">
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
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{p.totalBookings} bookings</span>
                  <span>{p.totalHours.toFixed(1)}h</span>
                  <span className="truncate">{p.hotel || "—"}</span>
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
    </div>
  );
}
