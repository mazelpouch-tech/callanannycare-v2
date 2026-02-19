import { useState, useEffect, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, User, Clock } from "lucide-react";
import { useData } from "../../context/DataContext";

const statusDot = {
  pending: "bg-yellow-400",
  confirmed: "bg-green-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-400",
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function NannyCalendar() {
  const { nannyBookings, fetchNannyBookings } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchNannyBookings();
  }, [fetchNannyBookings]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const bookingsByDate = useMemo(() => {
    const map = {};
    nannyBookings.forEach((b) => {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [nannyBookings]);

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return bookingsByDate[key] || [];
  }, [selectedDate, bookingsByDate]);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          My Calendar
        </h1>
        <p className="text-muted-foreground mt-1">
          View your bookings on the calendar
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4 sm:p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted/50 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-lg text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted/50 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayBookings = bookingsByDate[dateKey] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const selected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={`relative min-h-[52px] sm:min-h-[64px] p-1 rounded-lg text-sm transition-all ${
                    !inMonth
                      ? "text-muted-foreground/30"
                      : selected
                      ? "bg-accent/15 border-2 border-accent"
                      : today
                      ? "bg-primary/5 ring-2 ring-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span
                    className={`block text-xs sm:text-sm font-medium ${
                      !inMonth
                        ? ""
                        : today
                        ? "text-primary font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Booking dots */}
                  {dayBookings.length > 0 && inMonth && (
                    <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div
                          key={b.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            statusDot[b.status] || "bg-gray-400"
                          }`}
                        />
                      ))}
                      {dayBookings.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{dayBookings.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
            {Object.entries(statusDot).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-muted-foreground capitalize">
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d")
                : "Select a day"}
            </h3>
            {selectedDate && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedDayBookings.length} booking
                {selectedDayBookings.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {!selectedDate ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Click a date to see bookings
            </div>
          ) : selectedDayBookings.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No bookings on this day
            </div>
          ) : (
            <div className="divide-y divide-border">
              {selectedDayBookings.map((booking) => (
                <div key={booking.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground text-sm">
                        {booking.clientName}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        statusColors[booking.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {booking.startTime}
                    {booking.endTime ? ` - ${booking.endTime}` : ""}
                    <span className="ml-2 capitalize text-xs bg-muted px-1.5 py-0.5 rounded">
                      {booking.plan}
                    </span>
                  </div>

                  {booking.hotel && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {booking.hotel}
                    </div>
                  )}

                  {booking.totalPrice > 0 && (
                    <p className="text-sm font-medium text-foreground">
                      {booking.totalPrice} MAD
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
