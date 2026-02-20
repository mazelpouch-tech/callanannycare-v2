import { useState, useMemo, useEffect } from "react";
import {
  Search, Trash2, ChevronDown,
  Plus, X, Loader2,
  FileText, Pencil, Send, Download, DollarSign, CheckCircle, AlertCircle,
  Clock, User, Phone, Mail, Hotel, Baby, Calculator, Car,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { useData } from "../../context/DataContext";
import PhoneInput from "../../components/PhoneInput";
import type { Booking } from "@/types";

const SERVICE_RATE = 150; // MAD/hr — client rate (same as booking page)
const TAXI_FEE = 100;

// ─── Helpers ────────────────────────────────────────────────

function calcWorkedHours(clockIn: string | null, clockOut: string | null): string {
  if (!clockIn || !clockOut) return "—";
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = Math.max(0, ms / 3600000);
  return hours.toFixed(1);
}

function formatClockTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return "—";
  }
}

function fmtDate(dateStr: string): string {
  try { return format(parseISO(dateStr), "MMM dd, yyyy"); } catch { return dateStr || "N/A"; }
}

// ─── Default Form ───────────────────────────────────────────

interface InvoiceForm {
  id?: number | string;
  nannyId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hotel: string;
  date: string;
  clockIn: string;
  clockOut: string;
  childrenCount: string;
  childrenAges: string;
  totalPrice: string;
  notes: string;
}

const emptyForm: InvoiceForm = {
  nannyId: "", clientName: "", clientEmail: "", clientPhone: "",
  hotel: "", date: "",
  clockIn: "", clockOut: "",
  childrenCount: "1", childrenAges: "", totalPrice: "", notes: "",
};

// ─── Main Component ─────────────────────────────────────────

export default function AdminInvoices() {
  const { bookings, nannies, addBooking, updateBooking, deleteBooking, resendInvoice } = useData();

  // Filters
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [dateFilter, setDateFilter] = useState<"all" | "this-month" | "last-month">("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<InvoiceForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Actions
  const [deleteConfirm, setDeleteConfirm] = useState<number | string | null>(null);
  const [resendingId, setResendingId] = useState<number | string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<number | string | null>(null);

  // View invoice
  const [viewInvoice, setViewInvoice] = useState<Booking | null>(null);

  // Auto-calculate total when clock times change
  useEffect(() => {
    if (!formData.clockIn || !formData.clockOut) return;
    try {
      const inTime = new Date(formData.clockIn);
      const outTime = new Date(formData.clockOut);
      const ms = outTime.getTime() - inTime.getTime();
      if (ms <= 0) return;
      const hours = ms / 3600000;
      let total = Math.round(hours * SERVICE_RATE);
      // Add taxi fee if night hours (after 7 PM or before 7 AM)
      const inHour = inTime.getHours();
      if (inHour >= 19 || inHour < 7) total += TAXI_FEE;
      setFormData((prev) => ({ ...prev, totalPrice: String(total) }));
    } catch {
      // skip
    }
  }, [formData.clockIn, formData.clockOut]);

  // ── Derived Data ──

  const invoices = useMemo(() => {
    return bookings
      .filter((b) => b.status === "completed" && b.clockOut)
      .sort((a, b) => {
        const da = new Date(a.clockOut!).getTime();
        const db = new Date(b.clockOut!).getTime();
        return sortOrder === "newest" ? db - da : da - db;
      });
  }, [bookings, sortOrder]);

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          (b.clientName || "").toLowerCase().includes(q) ||
          (b.nannyName || "").toLowerCase().includes(q) ||
          (b.clientEmail || "").toLowerCase().includes(q) ||
          String(b.id).includes(q)
      );
    }
    const now = new Date();
    if (dateFilter === "this-month") {
      const s = startOfMonth(now), e = endOfMonth(now);
      result = result.filter((b) => {
        try {
          const d = b.clockIn ? new Date(b.clockIn) : parseISO(b.date);
          return isWithinInterval(d, { start: s, end: e });
        } catch { return false; }
      });
    } else if (dateFilter === "last-month") {
      const prev = subMonths(now, 1);
      const s = startOfMonth(prev), e = endOfMonth(prev);
      result = result.filter((b) => {
        try {
          const d = b.clockIn ? new Date(b.clockIn) : parseISO(b.date);
          return isWithinInterval(d, { start: s, end: e });
        } catch { return false; }
      });
    }
    return result;
  }, [invoices, search, dateFilter]);

  const totalAmount = filteredInvoices.reduce((s, b) => s + (b.totalPrice || 0), 0);
  const thisMonthAmount = useMemo(() => {
    const now = new Date();
    const s = startOfMonth(now), e = endOfMonth(now);
    return invoices
      .filter((b) => {
        try {
          const d = b.clockIn ? new Date(b.clockIn) : parseISO(b.date);
          return isWithinInterval(d, { start: s, end: e });
        } catch { return false; }
      })
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  }, [invoices]);

  // ── Handlers ──

  const openCreate = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (inv: Booking) => {
    setFormData({
      id: inv.id,
      nannyId: String(inv.nannyId || ""),
      clientName: inv.clientName || "",
      clientEmail: inv.clientEmail || "",
      clientPhone: inv.clientPhone || "",
      hotel: inv.hotel || "",
      date: inv.date || "",
      clockIn: inv.clockIn ? new Date(inv.clockIn).toISOString().slice(0, 16) : "",
      clockOut: inv.clockOut ? new Date(inv.clockOut).toISOString().slice(0, 16) : "",
      childrenCount: String(inv.childrenCount || 1),
      childrenAges: inv.childrenAges || "",
      totalPrice: String(inv.totalPrice || 0),
      notes: inv.notes || "",
    });
    setIsEditing(true);
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (!formData.clientName.trim()) {
      setFormError("Parent name is required");
      return;
    }
    if (!formData.nannyId) {
      setFormError("Please select a nanny");
      return;
    }
    if (!formData.clockIn || !formData.clockOut) {
      setFormError("Clock-in and clock-out are required");
      return;
    }
    if (!formData.totalPrice || Number(formData.totalPrice) <= 0) {
      setFormError("Total price must be greater than 0");
      return;
    }

    setFormLoading(true);
    try {
      const nanny = nannies.find((n) => n.id === Number(formData.nannyId));
      // Auto-derive date from clockIn
      const derivedDate = formData.clockIn ? new Date(formData.clockIn).toISOString().slice(0, 10) : "";

      if (isEditing && formData.id) {
        await updateBooking(formData.id, {
          nannyId: Number(formData.nannyId),
          nannyName: nanny?.name || "",
          clientName: formData.clientName.trim(),
          clientEmail: formData.clientEmail.trim(),
          clientPhone: formData.clientPhone.trim(),
          hotel: formData.hotel.trim(),
          date: derivedDate,
          clockIn: new Date(formData.clockIn).toISOString(),
          clockOut: new Date(formData.clockOut).toISOString(),
          childrenCount: Number(formData.childrenCount) || 1,
          childrenAges: formData.childrenAges.trim(),
          totalPrice: Number(formData.totalPrice),
          notes: formData.notes.trim(),
          status: "completed",
        });
      } else {
        await addBooking({
          nannyId: Number(formData.nannyId),
          nannyName: nanny?.name || "",
          clientName: formData.clientName.trim(),
          clientEmail: formData.clientEmail.trim(),
          clientPhone: formData.clientPhone.trim(),
          hotel: formData.hotel.trim(),
          date: derivedDate,
          clockIn: new Date(formData.clockIn).toISOString(),
          clockOut: new Date(formData.clockOut).toISOString(),
          childrenCount: Number(formData.childrenCount) || 1,
          childrenAges: formData.childrenAges.trim(),
          totalPrice: Number(formData.totalPrice),
          notes: formData.notes.trim(),
          status: "completed",
        });
      }
      setShowModal(false);
    } catch {
      setFormError("Failed to save invoice. Please try again.");
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: number | string) => {
    await deleteBooking(id);
    setDeleteConfirm(null);
  };

  const handleResend = async (id: number | string) => {
    setResendingId(id);
    try {
      await resendInvoice(id);
      setResendSuccess(id);
      setTimeout(() => setResendSuccess(null), 3000);
    } catch {
      // silent fail
    }
    setResendingId(null);
  };

  const exportCSV = () => {
    const headers = ["Invoice #", "Billed To (Parent)", "Email", "Phone", "Caregiver", "Date", "Clock In", "Clock Out", "Hours", "Amount (MAD)"];
    const rows = filteredInvoices.map((inv) => [
      `INV-${inv.id}`,
      inv.clientName || "",
      inv.clientEmail || "",
      inv.clientPhone || "",
      inv.nannyName || "",
      inv.date || "",
      inv.clockIn ? formatClockTime(inv.clockIn) : "",
      inv.clockOut ? formatClockTime(inv.clockOut) : "",
      calcWorkedHours(inv.clockIn, inv.clockOut),
      String(inv.totalPrice || 0),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateField = (field: keyof InvoiceForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const activeNannies = nannies.filter((n) => n.status === "active");

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">From Call a Nanny to parents · {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 gradient-warm text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-warm"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalAmount.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">MAD</span></p>
              <p className="text-xs text-muted-foreground">Total Invoiced</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{thisMonthAmount.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">MAD</span></p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by parent, caregiver, email, or invoice #..."
            className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* ── Invoice Table ── */}
      <div className="bg-card rounded-xl border border-border shadow-soft">
        {filteredInvoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No invoices found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || dateFilter !== "all" ? "Try adjusting your filters." : "Create your first invoice or complete a booking with clock data."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice #</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Billed To (Parent)</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caregiver</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clock In/Out</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="text-sm font-mono font-medium text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          #INV-{inv.id}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-foreground">{inv.clientName || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{inv.clientEmail || ""}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{inv.nannyName || "Unassigned"}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-foreground font-medium">{formatClockTime(inv.clockIn)} – {formatClockTime(inv.clockOut)}</p>
                        <p className="text-xs text-muted-foreground/70">{inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : fmtDate(inv.date)}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{calcWorkedHours(inv.clockIn, inv.clockOut)}h</td>
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">{(inv.totalPrice || 0).toLocaleString()} MAD</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle className="w-3 h-3" />
                          Sent
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(inv)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResend(inv.id)}
                            disabled={resendingId === inv.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            title="Resend Invoice"
                          >
                            {resendingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                          {resendSuccess === inv.id && (
                            <span className="text-[10px] text-green-600 font-semibold">Sent!</span>
                          )}
                          {deleteConfirm === inv.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(inv.id)} className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-lg hover:bg-muted/80">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(inv.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-border">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setViewInvoice(inv)}
                      className="text-sm font-mono font-medium text-primary hover:underline cursor-pointer"
                    >
                      #INV-{inv.id}
                    </button>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Sent
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Billed To</p>
                      <p className="font-medium text-foreground text-sm">{inv.clientName || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{inv.clientEmail || ""}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground">{(inv.totalPrice || 0).toLocaleString()} MAD</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>Caregiver: {inv.nannyName || "Unassigned"}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatClockTime(inv.clockIn)} – {formatClockTime(inv.clockOut)}</span>
                    <span className="font-medium">{calcWorkedHours(inv.clockIn, inv.clockOut)}h</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => openEdit(inv)} className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleResend(inv.id)}
                      disabled={resendingId === inv.id}
                      className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      {resendingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      {resendSuccess === inv.id ? "Sent!" : "Resend"}
                    </button>
                    {deleteConfirm === inv.id ? (
                      <div className="flex items-center gap-1 ml-auto">
                        <button onClick={() => handleDelete(inv.id)} className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(inv.id)} className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors ml-auto">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── View Invoice Modal ── */}
      {viewInvoice && (() => {
        const inv = viewInvoice;
        const hours = calcWorkedHours(inv.clockIn, inv.clockOut);
        const hoursNum = inv.clockIn && inv.clockOut ? (new Date(inv.clockOut).getTime() - new Date(inv.clockIn).getTime()) / 3600000 : 0;
        const basePay = Math.round(hoursNum * SERVICE_RATE);
        const inHour = inv.clockIn ? new Date(inv.clockIn).getHours() : 0;
        const hasTaxi = inHour >= 19 || inHour < 7;
        return (
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto">
            <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
              {/* Header */}
              <div className="gradient-warm px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Invoice</p>
                    <h2 className="text-2xl font-serif font-bold">#INV-{inv.id}</h2>
                  </div>
                  <button onClick={() => setViewInvoice(null)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-white/70 text-xs mt-1">{inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : inv.date ? fmtDate(inv.date) : "N/A"}</p>
              </div>

              <div className="p-6 space-y-5">
                {/* From / To */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">From</p>
                    <p className="text-sm font-semibold text-foreground">Call a Nanny</p>
                    <p className="text-xs text-muted-foreground">Professional Childcare</p>
                    <p className="text-xs text-muted-foreground">Marrakech, Morocco</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">Billed To</p>
                    <p className="text-sm font-semibold text-foreground">{inv.clientName || "N/A"}</p>
                    {inv.clientEmail && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{inv.clientEmail}</p>}
                    {inv.clientPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{inv.clientPhone}</p>}
                    {inv.hotel && <p className="text-xs text-muted-foreground flex items-center gap-1"><Hotel className="w-3 h-3" />{inv.hotel}</p>}
                  </div>
                </div>

                {/* Service Details */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Details</p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Caregiver</span>
                      <span className="text-sm font-medium text-foreground">{inv.nannyName || "Unassigned"}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Clock In</span>
                      <span className="text-sm font-medium text-foreground">{formatClockTime(inv.clockIn)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Clock Out</span>
                      <span className="text-sm font-medium text-foreground">{formatClockTime(inv.clockOut)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">Hours Worked</span>
                      <span className="text-sm font-medium text-foreground">{hours}h</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Baby className="w-3.5 h-3.5" />Children</span>
                      <span className="text-sm font-medium text-foreground">{inv.childrenCount || 1}{inv.childrenAges ? ` (${inv.childrenAges})` : ""}</span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price Breakdown</p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">{hours}h × {SERVICE_RATE} MAD/hr</span>
                      <span className="text-sm font-medium text-foreground">{basePay} MAD</span>
                    </div>
                    {hasTaxi && (
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-sm text-amber-700 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" />Taxi fee (7 PM – 7 AM)</span>
                        <span className="text-sm font-medium text-amber-700">+{TAXI_FEE} MAD</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl p-5 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-foreground">{(inv.totalPrice || 0).toLocaleString()} <span className="text-lg text-muted-foreground">MAD</span></p>
                </div>

                {inv.notes && (
                  <div className="bg-muted/30 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground">{inv.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => { openEdit(inv); setViewInvoice(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { handleResend(inv.id); }}
                    disabled={resendingId === inv.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white gradient-warm rounded-xl hover:opacity-90 transition-opacity shadow-warm disabled:opacity-50"
                  >
                    {resendingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {resendSuccess === inv.id ? "Sent!" : "Resend Invoice"}
                  </button>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-border text-center">
                <p className="text-[10px] text-muted-foreground">Issued by Call a Nanny · callanannycare.com</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-serif text-lg font-semibold text-foreground">
                {isEditing ? "Edit Invoice" : "Create Invoice"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Caregiver */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Caregiver (Nanny) *</label>
                <select
                  value={formData.nannyId}
                  onChange={(e) => updateField("nannyId", e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                >
                  <option value="">Select nanny...</option>
                  {activeNannies.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              {/* Billed To (Parent) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Parent Name *</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => updateField("clientName", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Parent Email</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => updateField("clientEmail", e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                  <PhoneInput
                    value={formData.clientPhone}
                    onChange={(val) => updateField("clientPhone", val)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Hotel</label>
                  <input
                    type="text"
                    value={formData.hotel}
                    onChange={(e) => updateField("hotel", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Clock In/Out */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Clock In *</label>
                  <input
                    type="datetime-local"
                    value={formData.clockIn}
                    onChange={(e) => updateField("clockIn", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Clock Out *</label>
                  <input
                    type="datetime-local"
                    value={formData.clockOut}
                    onChange={(e) => updateField("clockOut", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* Auto-calc breakdown */}
              {formData.clockIn && formData.clockOut && (() => {
                try {
                  const inT = new Date(formData.clockIn);
                  const outT = new Date(formData.clockOut);
                  const ms = outT.getTime() - inT.getTime();
                  if (ms <= 0) return null;
                  const hours = ms / 3600000;
                  const base = Math.round(hours * SERVICE_RATE);
                  const inHour = inT.getHours();
                  const isNight = inHour >= 19 || inHour < 7;
                  return (
                    <div className="bg-blue-50 text-blue-800 text-xs px-4 py-3 rounded-lg border border-blue-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calculator className="w-3.5 h-3.5" />
                        Auto-calculated breakdown
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{hours.toFixed(1)}h × {SERVICE_RATE} MAD/hr</span>
                        <span className="font-medium">{base} MAD</span>
                      </div>
                      {isNight && (
                        <div className="flex items-center justify-between text-amber-700">
                          <span className="flex items-center gap-1"><Car className="w-3 h-3" /> Taxi fee (7 PM – 7 AM)</span>
                          <span className="font-medium">+{TAXI_FEE} MAD</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between font-bold border-t border-blue-200 pt-1 mt-1">
                        <span>Total</span>
                        <span>{isNight ? base + TAXI_FEE : base} MAD</span>
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* Children & Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Children</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.childrenCount}
                    onChange={(e) => updateField("childrenCount", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Ages</label>
                  <input
                    type="text"
                    value={formData.childrenAges}
                    onChange={(e) => updateField("childrenAges", e.target.value)}
                    placeholder="e.g. 3, 5"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Total (MAD) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.totalPrice}
                    onChange={(e) => updateField("totalPrice", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 gradient-warm text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all shadow-warm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      {isEditing ? "Update Invoice" : "Create Invoice"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
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
