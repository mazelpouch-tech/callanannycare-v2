import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  MessageCircle,
  Baby,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { useData } from "../../context/DataContext";
import type { Booking, BookingStatus } from "@/types";

const statusDots: Record<BookingStatus, string> = {
  pending: "bg-yellow-400",
  confirmed: "bg-green-400",
  completed: "bg-blue-400",
  cancelled: "bg-red-400",
};

export default function AdminCalendar() {
  const { bookings, nannies } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    const days = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [calStart, calEnd]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      if (!b.date) return;
      const key = b.date;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const selectedBookings = useMemo(() => {
    const key = format(selectedDate, "yyyy-MM-dd");
    return (bookingsByDate[key] || []).sort((a: Booking, b: Booking) =>
      (a.startTime || "").localeCompare(b.startTime || "")
    );
  }, [selectedDate, bookingsByDate]);

  const whatsAppParent = (phone: string, name: string, date: string) => {
    const text = encodeURIComponent(`Hi ${name}, this is call a nanny regarding your booking on ${date} — `);
    window.open(`https://wa.me/${phone?.replace(/\D/g, "")}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">
          Calendar
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          All bookings across all nannies at a glance
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Grid */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-serif text-lg font-bold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayBookings = bookingsByDate[dateKey] || [];
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`relative p-1.5 sm:p-2 min-h-[60px] sm:min-h-[75px] border-b border-r border-border text-left transition-colors
                    ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}
                    ${!isCurrentMonth ? "opacity-40" : ""}
                  `}
                >
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      today
                        ? "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full gradient-warm text-white"
                        : isSelected
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {/* Booking dots */}
                  {dayBookings.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {dayBookings.slice(0, 4).map((b, j) => (
                        <div
                          key={j}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                            statusDots[b.status] || "bg-gray-400"
                          }`}
                        />
                      ))}
                      {dayBookings.length > 4 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{dayBookings.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-border">
            {Object.entries(statusDots).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-muted-foreground capitalize">{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Date Detail */}
        <div className="lg:w-[340px]">
          <div className="bg-card rounded-xl border border-border shadow-soft">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {format(selectedDate, "EEEE, MMM d")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedBookings.length} booking{selectedBookings.length !== 1 ? "s" : ""}
              </p>
            </div>

            {selectedBookings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No bookings on this day
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {selectedBookings.map((booking) => {
                  const nanny = nannies.find((n) => n.id === booking.nannyId);
                  return (
                    <div key={booking.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground text-sm">
                          {booking.clientName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : booking.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "completed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          {nanny?.name || booking.nannyName || "Unassigned"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {booking.startTime}
                          {booking.endTime ? ` - ${booking.endTime}` : ""} · {booking.plan}
                        </div>
                        {booking.hotel && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            {booking.hotel}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Baby className="w-3 h-3" />
                          {booking.childrenCount || 1} child{(booking.childrenCount || 1) > 1 ? "ren" : ""}
                          {booking.childrenAges ? ` (${booking.childrenAges})` : ""}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-bold text-foreground">
                          {booking.totalPrice} MAD
                        </span>
                        {booking.clientPhone && (
                          <button
                            onClick={() =>
                              whatsAppParent(
                                booking.clientPhone,
                                booking.clientName,
                                booking.date
                              )
                            }
                            className="flex items-center gap-1 text-[10px] text-green-600 hover:underline font-medium"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
