import { useState, useMemo, useCallback } from "react";
import {
  DollarSign, CheckCircle, Clock,
  Phone, User, Calendar, ChevronDown, ChevronUp,
  Hotel, Search, X, AlertTriangle, MessageCircle,
  CreditCard, Banknote, Wallet,
} from "lucide-react";
import { parseISO } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { Booking } from "@/types";

type ViewTab = "to-collect" | "collected" | "by-nanny";

export default function SupervisorRevenue() {
  const { bookings, nannies, markAsCollected, adminProfile } = useData();
  const { toDH } = useExchangeRate();
  const [tab, setTab] = useState<ViewTab>("to-collect");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [nannyFilter, setNannyFilter] = useState("all");

  // Collection modal state
  const [collectingBooking, setCollectingBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [collectionNote, setCollectionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const now = new Date();

  // Overdue helper: booking date has passed
  const isOverdue = useCallback((b: Booking): boolean => {
    try {
      return parseISO(b.date) < now;
    } catch { return false; }
  }, [now]);

  // To collect = confirmed bookings not yet collected
  const toCollect = useMemo(() => {
    let filtered = bookings.filter((b) => b.status === "confirmed" && !b.collectedAt);
    if (nannyFilter !== "all") filtered = filtered.filter((b) => String(b.nannyId) === nannyFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.clientName?.toLowerCase().includes(q) || b.clientPhone?.toLowerCase().includes(q) || b.hotel?.toLowerCase().includes(q)
      );
    }
    // Sort: overdue first, then by date ascending
    return filtered.sort((a, b) => {
      const aOverdue = isOverdue(a) ? 0 : 1;
      const bOverdue = isOverdue(b) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return a.date.localeCompare(b.date);
    });
  }, [bookings, nannyFilter, search, isOverdue]);

  // Collected = bookings with collectedAt set
  const collected = useMemo(() => {
    let filtered = bookings.filter((b) => !!b.collectedAt);
    if (nannyFilter !== "all") filtered = filtered.filter((b) => String(b.nannyId) === nannyFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.clientName?.toLowerCase().includes(q) || b.clientPhone?.toLowerCase().includes(q) || b.hotel?.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""));
  }, [bookings, nannyFilter, search]);

  // By nanny — showing to-collect vs collected split (no totals)
  const byNanny = useMemo(() => {
    const map = new Map<number, { nanny: string; toCollect: number; collected: number; toCollectCount: number; collectedCount: number }>();
    bookings.forEach((b) => {
      if (b.status === "cancelled" || b.status === "pending") return;
      const id = b.nannyId || 0;
      if (!map.has(id)) map.set(id, { nanny: b.nannyName, toCollect: 0, collected: 0, toCollectCount: 0, collectedCount: 0 });
      const entry = map.get(id)!;
      if (b.collectedAt) {
        entry.collected += b.totalPrice || 0;
        entry.collectedCount++;
      } else if (b.status === "confirmed") {
        entry.toCollect += b.totalPrice || 0;
        entry.toCollectCount++;
      }
    });
    return Array.from(map.values())
      .filter((e) => e.toCollect > 0 || e.collected > 0)
      .sort((a, b) => b.toCollect - a.toCollect);
  }, [bookings]);

  const totalToCollect = toCollect.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const totalCollected = collected.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const overdueCount = toCollect.filter(isOverdue).length;

  const tabs: { key: ViewTab; label: string; badge?: number }[] = [
    { key: "to-collect", label: "To Collect", badge: overdueCount > 0 ? overdueCount : undefined },
    { key: "collected", label: "Collected" },
    { key: "by-nanny", label: "By Nanny" },
  ];

  // Handle collection
  const handleCollect = async () => {
    if (!collectingBooking) return;
    setIsSubmitting(true);
    try {
      await markAsCollected(collectingBooking.id, {
        collectedBy: adminProfile?.name || "Supervisor",
        paymentMethod,
        collectionNote: collectionNote.trim() || undefined,
      });
      setCollectingBooking(null);
      setPaymentMethod("cash");
      setCollectionNote("");
    } catch (err) {
      console.error("Collection failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, "");
    window.open(`https://wa.me/${cleaned}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Collections</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track and manage payment collections
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">To Collect</p>
              <p className="text-xl font-bold text-foreground">{totalToCollect}€</p>
            </div>
            {overdueCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                {overdueCount} overdue
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{toDH(totalToCollect)} DH · {toCollect.length} bookings</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-xl font-bold text-foreground">{totalCollected}€</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{toDH(totalCollected)} DH · {collected.length} bookings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.badge && (
              <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters (for to-collect and collected tabs) */}
      {(tab === "to-collect" || tab === "collected") && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, phone, or hotel..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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
      )}

      {/* To Collect Tab */}
      {tab === "to-collect" && (
        <div className="space-y-3">
          {toCollect.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No pending collections</p>
            </div>
          ) : (
            toCollect.map((b) => {
              const overdue = isOverdue(b);
              return (
                <div key={b.id} className={`bg-card rounded-2xl border overflow-hidden ${overdue ? "border-red-300" : "border-amber-200"}`}>
                  <div
                    className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${overdue ? "bg-red-50" : "bg-amber-50"}`}>
                      {overdue ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{b.clientName}</p>
                        {overdue && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 shrink-0">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.nannyName} · {b.date} · {b.startTime}–{b.endTime}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${overdue ? "text-red-700" : "text-amber-700"}`}>{b.totalPrice}€</p>
                      <p className="text-[10px] text-muted-foreground">{toDH(b.totalPrice)} DH</p>
                    </div>
                    {expandedId === b.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {expandedId === b.id && (
                    <div className={`px-5 pb-5 pt-0 border-t ${overdue ? "border-red-200" : "border-amber-200"}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {/* Parent Contact */}
                        <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                          <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-3">Parent Contact</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-amber-700" />
                              <span className="text-foreground font-medium">{b.clientName}</span>
                            </div>
                            {b.clientPhone && (
                              <div className="flex items-center gap-2">
                                <a href={`tel:${b.clientPhone}`} className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 font-medium">
                                  <Phone className="w-4 h-4" />
                                  <span>{b.clientPhone}</span>
                                </a>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openWhatsApp(b.clientPhone); }}
                                  className="ml-1 p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            {b.hotel && (
                              <div className="flex items-center gap-2 text-sm">
                                <Hotel className="w-4 h-4 text-amber-700" />
                                <span className="text-foreground">{b.hotel}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Booking Info */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Details</h4>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Booking #: </span>
                            <span className="text-foreground font-medium">{b.id}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{b.date}{b.endDate && b.endDate !== b.date ? ` → ${b.endDate}` : ""}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{b.startTime} – {b.endTime}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Nanny: </span>
                            <span className="text-foreground font-medium">{b.nannyName}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Plan: </span>
                            <span className="text-foreground capitalize">{b.plan}</span>
                          </div>
                          {b.childrenCount > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Children: </span>
                              <span>{b.childrenCount} ({b.childrenAges || "ages not specified"})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Collect Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollectingBooking(b);
                          setPaymentMethod("cash");
                          setCollectionNote("");
                        }}
                        className="mt-4 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Collected — {b.totalPrice}€ ({toDH(b.totalPrice)} DH)
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {toCollect.length > 0 && (
            <div className={`rounded-2xl border p-5 flex items-center justify-between ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
              <p className={`text-sm font-medium ${overdueCount > 0 ? "text-red-800" : "text-amber-800"}`}>
                Total: {toCollect.length} booking{toCollect.length !== 1 ? "s" : ""}
                {overdueCount > 0 && ` (${overdueCount} overdue)`}
              </p>
              <p className={`text-lg font-bold ${overdueCount > 0 ? "text-red-800" : "text-amber-800"}`}>
                {totalToCollect}€ ({toDH(totalToCollect)} DH)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Collected Tab */}
      {tab === "collected" && (
        <div className="space-y-3">
          {collected.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No collections yet</p>
            </div>
          ) : (
            collected.map((b) => (
              <div key={b.id} className="bg-card rounded-2xl border border-green-200 overflow-hidden">
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{b.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.nannyName} · {b.date} · {b.startTime}–{b.endTime}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-green-700">{b.totalPrice}€</p>
                    <p className="text-[10px] text-muted-foreground">{toDH(b.totalPrice)} DH</p>
                  </div>
                  {expandedId === b.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>

                {expandedId === b.id && (
                  <div className="px-5 pb-5 pt-0 border-t border-green-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {/* Collection Info */}
                      <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                        <h4 className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-3">Collection Info</h4>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Collected by: </span>
                            <span className="text-foreground font-medium">{b.collectedBy || "—"}</span>
                          </div>
                          {b.collectedAt && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">When: </span>
                              <span className="text-foreground">
                                {(() => {
                                  try {
                                    const d = parseISO(b.collectedAt);
                                    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                                  } catch { return b.collectedAt; }
                                })()}
                              </span>
                            </div>
                          )}
                          {b.paymentMethod && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Payment: </span>
                              <span className="text-foreground capitalize">{b.paymentMethod}</span>
                            </div>
                          )}
                          {b.collectionNote && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Note: </span>
                              <span className="text-foreground">{b.collectionNote}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Booking Details */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Details</h4>
                        <div className="text-sm"><span className="text-muted-foreground">Booking #: </span><span className="font-medium">{b.id}</span></div>
                        <div className="text-sm"><span className="text-muted-foreground">Client: </span><span className="font-medium">{b.clientName}</span></div>
                        {b.clientPhone && (
                          <div className="flex items-center gap-2">
                            <a href={`tel:${b.clientPhone}`} className="flex items-center gap-1 text-sm text-violet-600 hover:underline">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{b.clientPhone}</span>
                            </a>
                            <button
                              onClick={(e) => { e.stopPropagation(); openWhatsApp(b.clientPhone); }}
                              className="p-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-sm"><span className="text-muted-foreground">Nanny: </span><span className="font-medium">{b.nannyName}</span></div>
                        <div className="text-sm"><span className="text-muted-foreground">Date: </span><span>{b.date}</span></div>
                        <div className="text-sm"><span className="text-muted-foreground">Time: </span><span>{b.startTime}–{b.endTime}</span></div>
                        {b.hotel && (
                          <div className="flex items-center gap-2 text-sm">
                            <Hotel className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{b.hotel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {collected.length > 0 && (
            <div className="bg-green-50 rounded-2xl border border-green-200 p-5 flex items-center justify-between">
              <p className="text-sm font-medium text-green-800">
                Total collected: {collected.length} booking{collected.length !== 1 ? "s" : ""}
              </p>
              <p className="text-lg font-bold text-green-800">
                {totalCollected}€ ({toDH(totalCollected)} DH)
              </p>
            </div>
          )}
        </div>
      )}

      {/* By Nanny Tab */}
      {tab === "by-nanny" && (
        <div className="space-y-3">
          {byNanny.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <p className="text-muted-foreground">No collection data yet</p>
            </div>
          ) : (
            byNanny.map((entry, idx) => (
              <div key={idx} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <span className="text-violet-700 font-bold text-sm">{entry.nanny.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{entry.nanny}</p>
                    <p className="text-xs text-muted-foreground">{entry.toCollectCount + entry.collectedCount} bookings</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-amber-700">{entry.toCollect}€</p>
                    <p className="text-[10px] text-amber-600">{entry.toCollectCount} To Collect</p>
                  </div>
                  <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-green-700">{entry.collected}€</p>
                    <p className="text-[10px] text-green-600">{entry.collectedCount} Collected</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Collection Confirmation Modal */}
      {collectingBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => !isSubmitting && setCollectingBooking(null)} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl border border-border w-full sm:max-w-md mx-auto shadow-xl z-10 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Confirm Collection</h3>
                <button
                  onClick={() => !isSubmitting && setCollectingBooking(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Amount */}
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                <p className="text-3xl font-bold text-green-700">{collectingBooking.totalPrice}€</p>
                <p className="text-sm text-green-600 mt-1">{toDH(collectingBooking.totalPrice)} DH</p>
              </div>

              {/* Booking summary */}
              <div className="space-y-1 text-sm">
                <div><span className="text-muted-foreground">Client: </span><span className="font-medium">{collectingBooking.clientName}</span></div>
                <div><span className="text-muted-foreground">Nanny: </span><span className="font-medium">{collectingBooking.nannyName}</span></div>
                <div><span className="text-muted-foreground">Booking: </span><span>{collectingBooking.date} · {collectingBooking.startTime}–{collectingBooking.endTime}</span></div>
                {collectingBooking.hotel && (
                  <div><span className="text-muted-foreground">Hotel: </span><span>{collectingBooking.hotel}</span></div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "cash", label: "Cash", icon: Banknote },
                    { value: "bank", label: "Bank Transfer", icon: CreditCard },
                    { value: "card", label: "Card", icon: Wallet },
                  ].map((pm) => (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                        paymentMethod === pm.value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-card text-muted-foreground hover:border-green-300"
                      }`}
                    >
                      <pm.icon className="w-5 h-5" />
                      <span className="text-xs">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Note (optional)</label>
                <textarea
                  value={collectionNote}
                  onChange={(e) => setCollectionNote(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button
                onClick={() => !isSubmitting && setCollectingBooking(null)}
                disabled={isSubmitting}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCollect}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Collection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
