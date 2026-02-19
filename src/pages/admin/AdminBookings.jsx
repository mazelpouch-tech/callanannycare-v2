import { useState, useMemo, Fragment } from "react";
import {
  Search,
  Filter,
  Eye,
  Check,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Baby,
  Hotel,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useData } from "../../context/DataContext";

const statusConfig = {
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

const statusFilters = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function AdminBookings() {
  const { bookings, updateBookingStatus, deleteBooking } = useData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedRow, setExpandedRow] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (b) =>
          (b.clientName || b.parentName || "").toLowerCase().includes(query) ||
          (b.nannyName || "").toLowerCase().includes(query) ||
          (b.clientEmail || b.email || "").toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [bookings, search, statusFilter, sortOrder]);

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr || "N/A";
    }
  };

  const formatTime = (timeStr) => {
    return timeStr || "N/A";
  };

  const truncateId = (id) => {
    if (!id) return "N/A";
    return typeof id === "string" && id.length > 8
      ? `${id.slice(0, 8)}...`
      : id;
  };

  const handleDelete = (id) => {
    deleteBooking(id);
    setDeleteConfirm(null);
  };

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">
            Manage Bookings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or nanny name..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            >
              {statusFilters.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="appearance-none pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bookings Table / Cards */}
      {filteredBookings.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-soft">
          <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-medium text-foreground text-lg">No bookings found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Bookings will appear here once clients start booking."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nanny
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBookings.map((booking) => {
                    const status = statusConfig[booking.status] || statusConfig.pending;
                    const isExpanded = expandedRow === booking.id;

                    return (
                      <Fragment key={booking.id}>
                        <tr className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                            {truncateId(booking.id)}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                            {booking.clientName || booking.parentName || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {booking.clientEmail || booking.email || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {booking.clientPhone || booking.phone || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {booking.nannyName || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {formatDate(booking.date)}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {formatTime(booking.time)}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground capitalize">
                            {booking.plan || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                            {booking.totalPrice ? `${booking.totalPrice} MAD` : "N/A"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Expand / View */}
                              <button
                                onClick={() => toggleExpand(booking.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="View details"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>

                              {/* Confirm */}
                              {booking.status === "pending" && (
                                <button
                                  onClick={() =>
                                    updateBookingStatus(booking.id, "confirmed")
                                  }
                                  className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                                  title="Confirm booking"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {/* Complete */}
                              {booking.status === "confirmed" && (
                                <button
                                  onClick={() =>
                                    updateBookingStatus(booking.id, "completed")
                                  }
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Mark as completed"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {/* Cancel */}
                              {(booking.status === "pending" ||
                                booking.status === "confirmed") && (
                                <button
                                  onClick={() =>
                                    updateBookingStatus(booking.id, "cancelled")
                                  }
                                  className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors"
                                  title="Cancel booking"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete */}
                              {deleteConfirm === booking.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(booking.id)}
                                    className="text-xs font-medium text-white bg-destructive px-2 py-1 rounded-lg hover:bg-destructive/90 transition-colors"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg hover:bg-muted/80 transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(booking.id)}
                                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                  title="Delete booking"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={11}
                              className="px-4 py-4 bg-muted/20"
                            >
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Hotel className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Hotel / Location
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {booking.hotel || booking.location || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Baby className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Children
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {booking.childrenCount || booking.numberOfChildren || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Children Ages
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {booking.childrenAges
                                        ? Array.isArray(booking.childrenAges)
                                          ? booking.childrenAges.join(", ")
                                          : booking.childrenAges
                                        : "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Notes
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {booking.notes || booking.specialRequests || "None"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredBookings.map((booking) => {
              const status = statusConfig[booking.status] || statusConfig.pending;
              const isExpanded = expandedRow === booking.id;

              return (
                <div
                  key={booking.id}
                  className="bg-card rounded-xl border border-border shadow-soft overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {booking.clientName || booking.parentName || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ID: {truncateId(booking.id)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{booking.nannyName || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatDate(booking.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatTime(booking.time)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {booking.clientEmail || booking.email || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{booking.clientPhone || booking.phone || "N/A"}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {booking.totalPrice ? `${booking.totalPrice} MAD` : "N/A"}
                        </span>
                        <span className="ml-1 capitalize">({booking.plan || "N/A"})</span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Hotel className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Hotel</p>
                            <p className="font-medium text-foreground">
                              {booking.hotel || booking.location || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Baby className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Children</p>
                            <p className="font-medium text-foreground">
                              {booking.childrenCount || booking.numberOfChildren || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Notes</p>
                          <p className="font-medium text-foreground mt-0.5">
                            {booking.notes || booking.specialRequests || "None"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center border-t border-border divide-x divide-border">
                    <button
                      onClick={() => toggleExpand(booking.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Less
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Details
                        </>
                      )}
                    </button>

                    {booking.status === "pending" && (
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "confirmed")
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm
                      </button>
                    )}

                    {booking.status === "confirmed" && (
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "completed")
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Complete
                      </button>
                    )}

                    {(booking.status === "pending" ||
                      booking.status === "confirmed") && (
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "cancelled")
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}

                    {deleteConfirm === booking.id ? (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5">
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="text-xs font-medium text-white bg-destructive px-2 py-1 rounded"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(booking.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
