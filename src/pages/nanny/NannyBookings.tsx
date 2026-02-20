import { useEffect, useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ClipboardList,
  CheckCircle,
  XCircle,
  MessageCircle,
  Loader2,
  PlayCircle,
  StopCircle,
  Timer,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { Fragment } from "react";
import {
  statusColors,
  formatDuration,
  formatHoursWorked,
  calcShiftPay,
  isToday,
} from "@/utils/shiftHelpers";

interface LiveTimerProps { clockIn: string }

// Live timer component
function LiveTimer({ clockIn }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(clockIn).getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(clockIn).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [clockIn]);

  return (
    <span className="font-mono text-sm font-bold tabular-nums">
      {formatDuration(elapsed)}
    </span>
  );
}

export default function NannyBookings() {
  const { nannyBookings, fetchNannyBookings, updateBookingStatus, clockInBooking, clockOutBooking } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  useEffect(() => {
    fetchNannyBookings();
  }, [fetchNannyBookings]);

  // Find active shift (clocked in but not clocked out)
  const activeShift = useMemo(
    () => nannyBookings.find((b) => b.clockIn && !b.clockOut && b.status !== "cancelled"),
    [nannyBookings]
  );

  const handleAccept = async (id: number | string) => {
    setActionLoading(id);
    await updateBookingStatus(id, "confirmed");
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const handleDecline = async (id: number | string) => {
    setActionLoading(id);
    await updateBookingStatus(id, "cancelled");
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const handleClockIn = async (id: number | string) => {
    setActionLoading(id);
    await clockInBooking(id);
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const handleClockOut = async (id: number | string) => {
    setActionLoading(id);
    await clockOutBooking(id);
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const openWhatsApp = (phone: string, clientName: string, date: string) => {
    const text = encodeURIComponent(
      `Hi ${clientName}, this is your nanny from call a nanny regarding your booking on ${date}. `
    );
    const num = phone?.replace(/\D/g, "");
    window.open(`https://wa.me/${num}?text=${text}`, "_blank");
  };

  const filtered = useMemo(() => {
    let result = [...nannyBookings];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.clientName?.toLowerCase().includes(q) ||
          b.hotel?.toLowerCase().includes(q) ||
          b.clientEmail?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }
    result.sort((a, b) =>
      sortOrder === "newest"
        ? (b.date || "").localeCompare(a.date || "")
        : (a.date || "").localeCompare(b.date || "")
    );
    return result;
  }, [nannyBookings, search, statusFilter, sortOrder]);

  const pendingCount = nannyBookings.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          My Bookings
        </h1>
        <p className="text-muted-foreground mt-1">
          {pendingCount > 0
            ? `You have ${pendingCount} pending booking${pendingCount > 1 ? "s" : ""} to review`
            : "View all your past and upcoming bookings"}
        </p>
      </div>

      {/* Active Shift Banner */}
      {activeShift && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <Timer className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Active Shift</p>
              <p className="text-sm text-green-700">
                {activeShift.clientName} · {activeShift.hotel || "No hotel"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-100 px-3 py-1.5 rounded-lg">
              <LiveTimer clockIn={activeShift.clockIn!} />
            </div>
            <button
              onClick={() => handleClockOut(activeShift.id)}
              disabled={actionLoading === activeShift.id}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === activeShift.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4" />
              )}
              End Shift
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, hotel, or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-4 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Results */}
      <div className="bg-card rounded-xl border border-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No bookings found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Shift</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((booking) => (
                    <Fragment key={booking.id}>
                      <tr className="border-b border-border hover:bg-muted/30">
                        <td className="px-5 py-3 font-medium text-foreground">
                          {booking.clientName}
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {booking.date}
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {booking.startTime}
                          {booking.endTime ? ` - ${booking.endTime}` : ""}
                        </td>
                        <td className="px-5 py-3 text-sm capitalize">
                          {booking.plan}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                              statusColors[booking.status] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {/* Clock data */}
                          {booking.clockIn && booking.clockOut ? (
                            <div className="text-xs">
                              <span className="font-medium text-blue-700">
                                {formatHoursWorked(booking.clockIn!, booking.clockOut!)}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                · {calcShiftPay(booking.clockIn!, booking.clockOut!)} MAD
                              </span>
                            </div>
                          ) : booking.clockIn && !booking.clockOut ? (
                            <div className="flex items-center gap-1.5 text-green-700">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <LiveTimer clockIn={booking.clockIn!} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Accept/Decline for pending */}
                            {booking.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleAccept(booking.id)}
                                  disabled={actionLoading === booking.id}
                                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                                  title="Accept booking"
                                >
                                  {actionLoading === booking.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDecline(booking.id)}
                                  disabled={actionLoading === booking.id}
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                  title="Decline booking"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {/* Start Shift for confirmed bookings today, no active shift elsewhere */}
                            {booking.status === "confirmed" && !booking.clockIn && isToday(booking.date) && !activeShift && (
                              <button
                                onClick={() => handleClockIn(booking.id)}
                                disabled={actionLoading === booking.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                                title="Start Shift"
                              >
                                {actionLoading === booking.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <PlayCircle className="w-3.5 h-3.5" />
                                )}
                                Start Shift
                              </button>
                            )}
                            {/* End Shift for active shift */}
                            {booking.clockIn && !booking.clockOut && booking.status !== "cancelled" && (
                              <button
                                onClick={() => handleClockOut(booking.id)}
                                disabled={actionLoading === booking.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                title="End Shift"
                              >
                                {actionLoading === booking.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <StopCircle className="w-3.5 h-3.5" />
                                )}
                                End Shift
                              </button>
                            )}
                            {/* WhatsApp parent */}
                            {booking.clientPhone && (
                              <button
                                onClick={() =>
                                  openWhatsApp(
                                    booking.clientPhone,
                                    booking.clientName,
                                    booking.date
                                  )
                                }
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                title="WhatsApp client"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                            {/* Expand */}
                            <button
                              onClick={() =>
                                setExpandedId(
                                  expandedId === booking.id ? null : booking.id
                                )
                              }
                              className="p-1.5 rounded hover:bg-muted/50"
                            >
                              {expandedId === booking.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === booking.id && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Email</span>
                                <p className="font-medium">{booking.clientEmail}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Phone</span>
                                <p className="font-medium">{booking.clientPhone || "—"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Hotel</span>
                                <p className="font-medium">{booking.hotel || "—"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Children</span>
                                <p className="font-medium">
                                  {booking.childrenCount || 1}
                                  {booking.childrenAges
                                    ? ` (ages: ${booking.childrenAges})`
                                    : ""}
                                </p>
                              </div>
                              {booking.clockIn && (
                                <div>
                                  <span className="text-muted-foreground">Clocked In</span>
                                  <p className="font-medium">{new Date(booking.clockIn).toLocaleTimeString()}</p>
                                </div>
                              )}
                              {booking.clockOut && (
                                <div>
                                  <span className="text-muted-foreground">Clocked Out</span>
                                  <p className="font-medium">{new Date(booking.clockOut).toLocaleTimeString()}</p>
                                </div>
                              )}
                              {booking.notes && (
                                <div className="col-span-full">
                                  <span className="text-muted-foreground">Notes</span>
                                  <p className="font-medium">{booking.notes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((booking) => (
                <div key={booking.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">
                      {booking.clientName}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                        statusColors[booking.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {booking.date} · {booking.startTime}
                      {booking.endTime ? ` - ${booking.endTime}` : ""}
                    </div>
                    {booking.hotel && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {booking.hotel}
                      </div>
                    )}
                    <div className="pt-1">
                      <span className="capitalize">{booking.plan}</span>
                    </div>
                  </div>

                  {/* Shift info */}
                  {booking.clockIn && booking.clockOut && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                        {formatHoursWorked(booking.clockIn!, booking.clockOut!)}
                      </span>
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                        {calcShiftPay(booking.clockIn!, booking.clockOut!)} MAD
                      </span>
                    </div>
                  )}
                  {booking.clockIn && !booking.clockOut && booking.status !== "cancelled" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-700 text-xs font-medium">Active:</span>
                      <LiveTimer clockIn={booking.clockIn!} />
                    </div>
                  )}

                  {/* Action buttons for mobile */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {booking.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleAccept(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </>
                    )}

                    {/* Start Shift for confirmed bookings today */}
                    {booking.status === "confirmed" && !booking.clockIn && isToday(booking.date) && !activeShift && (
                      <button
                        onClick={() => handleClockIn(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <PlayCircle className="w-4 h-4" />
                        )}
                        Start Shift
                      </button>
                    )}

                    {/* End Shift for active shift */}
                    {booking.clockIn && !booking.clockOut && booking.status !== "cancelled" && (
                      <button
                        onClick={() => handleClockOut(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <StopCircle className="w-4 h-4" />
                        )}
                        End Shift
                      </button>
                    )}
                  </div>

                  {/* WhatsApp + details toggle */}
                  <div className="flex items-center gap-2 mt-2">
                    {booking.clientPhone && (
                      <button
                        onClick={() =>
                          openWhatsApp(booking.clientPhone, booking.clientName, booking.date)
                        }
                        className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === booking.id ? null : booking.id)
                      }
                      className="text-xs text-accent hover:underline"
                    >
                      {expandedId === booking.id ? "Hide details" : "Show details"}
                    </button>
                  </div>

                  {expandedId === booking.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {booking.clientEmail}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        {booking.clientPhone || "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Children:</span>{" "}
                        {booking.childrenCount || 1}
                        {booking.childrenAges
                          ? ` (ages: ${booking.childrenAges})`
                          : ""}
                      </p>
                      {booking.clockIn && (
                        <p>
                          <span className="text-muted-foreground">Clocked In:</span>{" "}
                          {new Date(booking.clockIn).toLocaleTimeString()}
                        </p>
                      )}
                      {booking.clockOut && (
                        <p>
                          <span className="text-muted-foreground">Clocked Out:</span>{" "}
                          {new Date(booking.clockOut).toLocaleTimeString()}
                        </p>
                      )}
                      {booking.notes && (
                        <p>
                          <span className="text-muted-foreground">Notes:</span>{" "}
                          {booking.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
