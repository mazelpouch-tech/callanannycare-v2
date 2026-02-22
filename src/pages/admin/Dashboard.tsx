import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, Clock, DollarSign, ArrowRight,
  Eye, TrendingUp, Users, Activity, Star,
  ArrowUpRight, ArrowDownRight, Timer, FileText, CheckCircle,
} from "lucide-react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval, subDays, isAfter } from "date-fns";
import { useData } from "../../context/DataContext";
import type { Booking, Nanny, BookingStatus } from "@/types";
import { calcShiftPayBreakdown, HOURLY_RATE } from "@/utils/shiftHelpers";

// ─── Chart Data Types ────────────────────────────────────────────

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

// ─── SVG Chart Components ────────────────────────────────────────

interface AreaChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  color?: string;
  id?: string;
}

function AreaChart({ data, width = 600, height = 220, color = "#cd6845", id = "area" }: AreaChartProps) {
  if (!data || data.length < 2) return null;
  const padding = { top: 20, right: 20, bottom: 40, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Y-axis ticks
  const yTicks = 5;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = minVal + (range / yTicks) * i;
    const y = padding.top + chartH - (i / yTicks) * chartH;
    return { val, y };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {yLines.map(({ val, y }, i) => (
        <g key={i}>
          <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e8e0d8" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "4,4"} />
          <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-[#8b7d72]" fontSize="10" fontFamily="DM Sans">{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}</text>
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={i} x={padding.left + (i / (data.length - 1)) * chartW} y={height - 8} textAnchor="middle" className="fill-[#8b7d72]" fontSize="10" fontFamily="DM Sans">{d.label}</text>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${id}-grad)`}>
        <animate attributeName="opacity" from="0" to="1" dur="0.8s" fill="freeze" />
      </path>

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-glow)`}>
        <animate attributeName="stroke-dashoffset" from="2000" to="0" dur="1.2s" fill="freeze" />
        <animate attributeName="stroke-dasharray" from="2000" to="2000" dur="0s" fill="freeze" />
      </path>

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={color} strokeWidth="2.5">
            <animate attributeName="r" from="0" to="5" dur="0.3s" begin={`${0.5 + i * 0.1}s`} fill="freeze" />
          </circle>
          {/* Tooltip hover area */}
          <circle cx={p.x} cy={p.y} r="16" fill="transparent" className="cursor-pointer">
            <title>{`${data[i].label}: ${data[i].value.toLocaleString()} MAD`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}

interface BarChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  colors?: string[];
}

function BarChart({ data, width = 600, height = 220, colors }: BarChartProps) {
  if (!data || data.length === 0) return null;
  const padding = { top: 20, right: 20, bottom: 40, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(40, (chartW / data.length) * 0.6);
  const gap = (chartW - barWidth * data.length) / (data.length + 1);

  const yTicks = 4;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = (maxVal / yTicks) * i;
    const y = padding.top + chartH - (i / yTicks) * chartH;
    return { val, y };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        {data.map((_d, i) => (
          <linearGradient key={i} id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors?.[i] || "#cd6845"} stopOpacity="1" />
            <stop offset="100%" stopColor={colors?.[i] || "#cd6845"} stopOpacity="0.7" />
          </linearGradient>
        ))}
      </defs>

      {yLines.map(({ val, y }, i) => (
        <g key={i}>
          <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e8e0d8" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "4,4"} />
          <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-[#8b7d72]" fontSize="10" fontFamily="DM Sans">{Math.round(val)}</text>
        </g>
      ))}

      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = padding.left + gap + i * (barWidth + gap);
        const y = padding.top + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} rx="4" fill={`url(#bar-grad-${i})`}>
              <animate attributeName="height" from="0" to={barH} dur="0.6s" begin={`${i * 0.08}s`} fill="freeze" />
              <animate attributeName="y" from={padding.top + chartH} to={y} dur="0.6s" begin={`${i * 0.08}s`} fill="freeze" />
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {/* Value on top */}
            {d.value > 0 && (
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-[#5a4e44]" fontSize="10" fontWeight="600" fontFamily="DM Sans">
                {d.value}
                <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin={`${0.5 + i * 0.08}s`} fill="freeze" />
              </text>
            )}
            <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="fill-[#8b7d72]" fontSize="10" fontFamily="DM Sans">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

interface DonutChartProps {
  segments: ChartSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

function DonutChart({ segments, size = 180, thickness = 28, centerLabel, centerValue }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[180px] mx-auto">
      {/* Background ring */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#ece5dd" strokeWidth={thickness} />

      {/* Segments */}
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dashLength = pct * circumference;
        const dashOffset = -offset * circumference;
        offset += pct;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-700"
          >
            <animate attributeName="stroke-dasharray" from={`0 ${circumference}`} to={`${dashLength} ${circumference - dashLength}`} dur="0.8s" begin={`${i * 0.15}s`} fill="freeze" />
            <title>{`${seg.label}: ${seg.value} (${Math.round(pct * 100)}%)`}</title>
          </circle>
        );
      })}

      {/* Center text */}
      <text x={size / 2} y={size / 2 - 8} textAnchor="middle" className="fill-[#352c24]" fontSize="22" fontWeight="700" fontFamily="DM Sans">{centerValue}</text>
      <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-[#8b7d72]" fontSize="10" fontFamily="DM Sans">{centerLabel}</text>
    </svg>
  );
}

interface HorizontalBarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

function HorizontalBarChart({ data }: { data: HorizontalBarChartDataPoint[] }) {
  const safeMax = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 shrink-0">
            <p className="text-xs font-medium text-foreground truncate" title={d.label}>{d.label}</p>
          </div>
          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${(d.value / safeMax) * 100}%`,
                background: d.color || "linear-gradient(90deg, #cd6845, #d98a6e)",
              }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-16 text-right">{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function MiniSparkline({ data, width = 80, height = 28, color = "#cd6845" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - minVal) / range) * (height - 4) - 2,
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg width={width} height={height} className="inline-block">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Nanny Hours Report ─────────────────────────────────────────

function NannyHoursReport({ bookings, nannies: _nannies }: { bookings: Booking[]; nannies: Nanny[] }) {
  const nannyHours = useMemo(() => {
    // Only consider bookings with clock data
    const clockedBookings = bookings.filter((b) => b.clockIn && b.clockOut);
    if (clockedBookings.length === 0) return [];

    const nannyMap: Record<string, { name: string; shifts: number; totalHours: number; basePay: number; taxiFee: number; totalPay: number }> = {};
    clockedBookings.forEach((b) => {
      const nannyId = b.nannyId;
      if (nannyId == null) return;
      const nannyName = b.nannyName || "Unknown";
      if (!nannyMap[nannyId]) {
        nannyMap[nannyId] = { name: nannyName, shifts: 0, totalHours: 0, basePay: 0, taxiFee: 0, totalPay: 0 };
      }
      const ms = new Date(b.clockOut!).getTime() - new Date(b.clockIn!).getTime();
      const hours = ms / 3600000;
      const bd = calcShiftPayBreakdown(b.clockIn!, b.clockOut!);

      nannyMap[nannyId].shifts += 1;
      nannyMap[nannyId].totalHours += hours;
      nannyMap[nannyId].basePay += bd.basePay;
      nannyMap[nannyId].taxiFee += bd.taxiFee;
      nannyMap[nannyId].totalPay += bd.total;
    });

    return Object.values(nannyMap)
      .map((n) => ({ ...n, totalHours: Math.round(n.totalHours * 10) / 10 }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [bookings]);

  const totalAllHours = nannyHours.reduce((s, n) => s + n.totalHours, 0);
  const totalAllBasePay = nannyHours.reduce((s, n) => s + n.basePay, 0);
  const totalAllTaxi = nannyHours.reduce((s, n) => s + n.taxiFee, 0);
  const totalAllPay = nannyHours.reduce((s, n) => s + n.totalPay, 0);
  const totalAllShifts = nannyHours.reduce((s, n) => s + n.shifts, 0);

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
          <Timer className="w-4 h-4 text-primary" />
          Nanny Hours Report
        </h2>
        {nannyHours.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{totalAllShifts} shifts</span>
            <span>{totalAllHours.toFixed(1)} hrs</span>
            <span className="font-semibold text-foreground">{totalAllPay.toLocaleString()} MAD</span>
            <span className="text-muted-foreground/70">({totalAllBasePay.toLocaleString()} + {totalAllTaxi} taxi)</span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {nannyHours.length === 0 && (
        <div className="px-6 py-10 text-center">
          <Timer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No shift data yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Hours will appear here once nannies start using Start Shift / End Shift.
          </p>
        </div>
      )}

      {nannyHours.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nanny</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shifts</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg/Shift</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hourly Pay</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxi Fee</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {nannyHours.map((nanny, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-foreground">{nanny.name}</p>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{nanny.shifts}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{nanny.totalHours}h</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {(nanny.totalHours / nanny.shifts).toFixed(1)}h
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground text-right">
                      {nanny.basePay.toLocaleString()} MAD
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      {nanny.taxiFee > 0 ? (
                        <span className="text-orange-600 font-medium">+{nanny.taxiFee} MAD</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-foreground text-right">
                      {nanny.totalPay.toLocaleString()} MAD
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-6 py-3 text-sm font-bold text-foreground">Total</td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground">{totalAllShifts}</td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground">{totalAllHours.toFixed(1)}h</td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground">
                    {totalAllShifts > 0 ? (totalAllHours / totalAllShifts).toFixed(1) : 0}h
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground text-right">{totalAllBasePay.toLocaleString()} MAD</td>
                  <td className="px-6 py-3 text-sm font-bold text-orange-600 text-right">
                    {totalAllTaxi > 0 ? `+${totalAllTaxi.toLocaleString()} MAD` : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground text-right">{totalAllPay.toLocaleString()} MAD</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {nannyHours.map((nanny, i) => (
              <div key={i} className="px-5 py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground text-sm">{nanny.name}</p>
                  <span className="text-sm font-semibold text-foreground">{nanny.totalPay.toLocaleString()} MAD</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{nanny.shifts} shifts</span>
                  <span>{nanny.totalHours}h total</span>
                  <span>{(nanny.totalHours / nanny.shifts).toFixed(1)}h avg</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Hourly: {nanny.basePay} MAD</span>
                  {nanny.taxiFee > 0 && (
                    <span className="text-orange-600">Taxi: +{nanny.taxiFee} MAD</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-3 border-t border-border text-[10px] text-muted-foreground">
            Rate: {HOURLY_RATE} MAD/hr ({Math.round(HOURLY_RATE * 8)} MAD/8h) · +100 MAD for evening shifts (7 PM - 7 AM)
          </div>
        </>
      )}
    </div>
  );
}

// ─── Status Config ───────────────────────────────────────────────

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-orange-50 text-orange-700 border border-orange-200" },
  confirmed: { label: "Confirmed", className: "bg-green-50 text-green-700 border border-green-200" },
  completed: { label: "Completed", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border border-red-200" },
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: "#4a9e6e",
  completed: "#4a7fbf",
  pending: "#d4873c",
  cancelled: "#d16060",
};

const PLAN_COLORS = {
  hourly: "#cd6845",
};

// ─── Main Dashboard ──────────────────────────────────────────────

export default function Dashboard() {
  const { bookings, nannies, stats, adminProfile, updateBookingStatus } = useData();

  // ── Compute monthly revenue data (last 7 months) ──
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const monthDate = subMonths(now, 6 - i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const revenue = bookings
        .filter((b) => (b.status === "confirmed" || b.status === "completed"))
        .filter((b) => {
          try {
            const d = parseISO(b.date);
            return isWithinInterval(d, { start, end });
          } catch { return false; }
        })
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      return { label: format(monthDate, "MMM"), value: revenue, month: monthDate };
    });
  }, [bookings]);

  // ── Monthly bookings by status ──
  const monthlyBookings = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const count = bookings.filter((b) => {
        try {
          return isWithinInterval(parseISO(b.date), { start, end });
        } catch { return false; }
      }).length;
      return { label: format(monthDate, "MMM"), value: count };
    });
  }, [bookings]);

  // ── Status distribution ──
  const statusDistribution = useMemo(() => {
    const counts = { confirmed: 0, completed: 0, pending: 0, cancelled: 0 };
    bookings.forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value,
        color: STATUS_COLORS[status as BookingStatus],
      }));
  }, [bookings]);

  // ── Top nannies by revenue ──
  const topNannies = useMemo(() => {
    const nannyRevenue: Record<string, number> = {};
    bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .forEach((b) => {
        const name = b.nannyName || "Unknown";
        nannyRevenue[name] = (nannyRevenue[name] || 0) + (b.totalPrice || 0);
      });
    return Object.entries(nannyRevenue)
      .map(([name, value]) => ({ label: name.split(" ")[0], value, color: `linear-gradient(90deg, #cd6845, #d98a6e)` }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bookings]);

  // ── Trend calculations (this month vs last month) ──
  const trends = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthBookings = bookings.filter((b) => {
      try { return isAfter(parseISO(b.date), thisMonthStart); } catch { return false; }
    });
    const lastMonthBookings = bookings.filter((b) => {
      try { return isWithinInterval(parseISO(b.date), { start: lastMonthStart, end: lastMonthEnd }); } catch { return false; }
    });

    const thisRevenue = thisMonthBookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((s, b) => s + (b.totalPrice || 0), 0);
    const lastRevenue = lastMonthBookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((s, b) => s + (b.totalPrice || 0), 0);

    const bookingsTrend = lastMonthBookings.length > 0 ? ((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length * 100) : 0;
    const revenueTrend = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue * 100) : 0;

    return { bookingsTrend, revenueTrend, thisMonthBookings: thisMonthBookings.length, thisRevenue };
  }, [bookings]);

  // ── Weekly sparkline (last 8 weeks) ──
  const weeklySparkline = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekEnd = subDays(now, (7 - i) * 7);
      const weekStart = subDays(weekEnd, 7);
      return bookings.filter((b) => {
        try {
          const d = parseISO(b.date);
          return isAfter(d, weekStart) && !isAfter(d, weekEnd);
        } catch { return false; }
      }).length;
    });
  }, [bookings]);

  const revenueSparkline = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekEnd = subDays(now, (7 - i) * 7);
      const weekStart = subDays(weekEnd, 7);
      return bookings
        .filter((b) => (b.status === "confirmed" || b.status === "completed"))
        .filter((b) => {
          try {
            const d = parseISO(b.date);
            return isAfter(d, weekStart) && !isAfter(d, weekEnd);
          } catch { return false; }
        })
        .reduce((s, b) => s + (b.totalPrice || 0), 0);
    });
  }, [bookings]);

  // ── Recent bookings ──
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // ── Invoices (completed bookings with clock data) ──
  const allInvoices = useMemo(() => {
    return bookings
      .filter((b) => b.status === "completed" && b.clockOut)
      .sort((a, b) => new Date(b.clockOut!).getTime() - new Date(a.clockOut!).getTime());
  }, [bookings]);

  const recentInvoices = allInvoices.slice(0, 10);
  const totalInvoiced = allInvoices.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const calcWorkedHours = (clockIn: string | null, clockOut: string | null): string => {
    if (!clockIn || !clockOut) return "—";
    const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.max(0, ms / 3600000);
    return hours.toFixed(1);
  };

  const formatTime = (isoStr: string | null): string => {
    if (!isoStr) return "—";
    try {
      return format(new Date(isoStr), "HH:mm");
    } catch {
      return "—";
    }
  };

  const activeNannies = nannies.filter((n) => n.status === "active" && n.available).length;
  const avgBookingValue = stats.totalBookings > 0 ? Math.round(stats.totalRevenue / Math.max(bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length, 1)) : 0;

  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), "MMM dd, yyyy"); } catch { return dateStr || "N/A"; }
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">
            Welcome back{adminProfile?.name ? `, ${adminProfile.name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here is your business overview and analytics.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      {/* ── Enhanced Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <MiniSparkline data={weeklySparkline} color="#cd6845" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalBookings}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Total Bookings</p>
            {trends.bookingsTrend !== 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trends.bookingsTrend >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {trends.bookingsTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(Math.round(trends.bookingsTrend))}%
              </span>
            )}
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-700" />
            </div>
            <MiniSparkline data={revenueSparkline} color="#4a9e6e" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalRevenue.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">MAD</span></p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            {trends.revenueTrend !== 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trends.revenueTrend >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {trends.revenueTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(Math.round(trends.revenueTrend))}%
              </span>
            )}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-700" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Avg Value</p>
              <p className="text-xs font-semibold text-foreground">{avgBookingValue.toLocaleString()} MAD</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.pendingBookings}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending Bookings</p>
        </div>

        {/* Active Nannies */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Confirmed</p>
              <p className="text-xs font-semibold text-foreground">{stats.confirmedBookings}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeNannies} <span className="text-sm font-normal text-muted-foreground">/ {nannies.length}</span></p>
          <p className="text-xs text-muted-foreground mt-1">Active Nannies</p>
        </div>
      </div>

      {/* ── Charts Row 1: Revenue + Bookings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend - 2/3 width */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-semibold text-foreground">Revenue Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly revenue over the last 7 months</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              {trends.thisRevenue.toLocaleString()} MAD this month
            </div>
          </div>
          <AreaChart data={monthlyRevenue} id="revenue" />
        </div>

        {/* Booking Status - 1/3 width */}
        <div className="bg-card rounded-xl border border-border shadow-soft p-5">
          <div className="mb-4">
            <h3 className="font-serif text-base font-semibold text-foreground">Booking Status</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution overview</p>
          </div>
          <DonutChart
            segments={statusDistribution}
            centerValue={stats.totalBookings}
            centerLabel="Total"
          />
          <div className="mt-4 space-y-2">
            {statusDistribution.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-muted-foreground">{seg.label}</span>
                </div>
                <span className="font-semibold text-foreground">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Monthly Bookings + Revenue by Plan + Top Nannies ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Bookings Bar Chart */}
        <div className="bg-card rounded-xl border border-border shadow-soft p-5">
          <div className="mb-4">
            <h3 className="font-serif text-base font-semibold text-foreground">Monthly Bookings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
          </div>
          <BarChart
            data={monthlyBookings}
            height={200}
            colors={monthlyBookings.map(() => "#cd6845")}
          />
        </div>

        {/* Total Revenue */}
        <div className="bg-card rounded-xl border border-border shadow-soft p-5">
          <div className="mb-4">
            <h3 className="font-serif text-base font-semibold text-foreground">Total Revenue</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All bookings (hourly plan)</p>
          </div>
          {stats.totalRevenue > 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <DollarSign className="w-10 h-10 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">MAD</p>
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS.hourly }} />
                <span className="text-muted-foreground">Hourly Plan</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No revenue data yet
            </div>
          )}
        </div>

        {/* Top Nannies */}
        <div className="bg-card rounded-xl border border-border shadow-soft p-5">
          <div className="mb-4">
            <h3 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Top Nannies
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">By total revenue earned</p>
          </div>
          {topNannies.length > 0 ? (
            <HorizontalBarChart data={topNannies} />
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No nanny data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Nanny Hours Report ── */}
      <NannyHoursReport bookings={bookings} nannies={nannies} />

      {/* ── Invoices Section ── */}
      <div className="bg-card rounded-xl border border-border shadow-soft">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Invoices
          </h2>
          {allInvoices.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{allInvoices.length} invoice{allInvoices.length !== 1 ? "s" : ""}</span>
              <span className="font-semibold text-foreground">{totalInvoiced.toLocaleString()} MAD</span>
            </div>
          )}
        </div>

        {recentInvoices.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No invoices yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Invoices are automatically generated and sent to parents when a nanny ends her shift.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice #</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Billed To</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caregiver</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-medium text-primary">#INV-{inv.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground">{inv.clientName || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{inv.clientEmail || ""}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{inv.nannyName || "Unassigned"}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">{formatDate(inv.date)}</p>
                        <p className="text-xs text-muted-foreground/70">{formatTime(inv.clockIn)} – {formatTime(inv.clockOut)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{calcWorkedHours(inv.clockIn, inv.clockOut)}h</td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">{(inv.totalPrice || 0).toLocaleString()} MAD</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle className="w-3 h-3" />
                          Sent
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-medium text-primary">#INV-{inv.id}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Sent
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Billed To</p>
                      <p className="font-medium text-foreground text-sm">{inv.clientName || "N/A"}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{(inv.totalPrice || 0).toLocaleString()} MAD</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Caregiver: {inv.nannyName || "Unassigned"}</span>
                    <span>{formatDate(inv.date)}</span>
                    <span>{calcWorkedHours(inv.clockIn, inv.clockOut)}h</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-border text-[10px] text-muted-foreground">
              Invoices are auto-sent to parents when the nanny ends her shift. Showing last {recentInvoices.length} of {allInvoices.length}.
            </div>
          </>
        )}
      </div>

      {/* ── Recent Bookings Table ── */}
      <div className="bg-card rounded-xl border border-border shadow-soft">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Recent Bookings
          </h2>
          <Link
            to="/admin/bookings"
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No bookings yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Bookings will appear here once clients start booking.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nanny</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentBookings.map((booking) => {
                    const status = statusConfig[booking.status] || statusConfig.pending;
                    return (
                      <tr key={booking.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-foreground">{booking.clientName || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">{booking.clientEmail || ""}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{booking.nannyName || "N/A"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(booking.date)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{(booking.totalPrice || 0).toLocaleString()} MAD</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {booking.status === "pending" && (
                              <button onClick={() => updateBookingStatus(booking.id, "confirmed")} className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 px-3 py-1.5 rounded-lg transition-colors">
                                Confirm
                              </button>
                            )}
                            {booking.status === "confirmed" && (
                              <button onClick={() => updateBookingStatus(booking.id, "completed")} className="text-xs font-medium text-blue-700 hover:text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                Complete
                              </button>
                            )}
                            <Link to="/admin/bookings" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {recentBookings.map((booking) => {
                const status = statusConfig[booking.status] || statusConfig.pending;
                return (
                  <div key={booking.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground text-sm">{booking.clientName || "N/A"}</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{booking.nannyName || "N/A"}</span>
                      <span>{formatDate(booking.date)}</span>
                      <span className="font-medium text-foreground">{(booking.totalPrice || 0).toLocaleString()} MAD</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.status === "pending" && (
                        <button onClick={() => updateBookingStatus(booking.id, "confirmed")} className="text-xs font-medium text-accent bg-accent/10 px-3 py-1.5 rounded-lg">
                          Confirm
                        </button>
                      )}
                      {booking.status === "confirmed" && (
                        <button onClick={() => updateBookingStatus(booking.id, "completed")} className="text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                          Complete
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/bookings" className="group flex items-center justify-between bg-card rounded-xl border border-border p-4 shadow-soft hover:shadow-warm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">All Bookings</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Manage & track bookings</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
        <Link to="/admin/nannies" className="group flex items-center justify-between bg-card rounded-xl border border-border p-4 shadow-soft hover:shadow-warm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Nannies</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Manage nanny profiles</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
        <Link to="/admin/users" className="group flex items-center justify-between bg-card rounded-xl border border-border p-4 shadow-soft hover:shadow-warm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <Eye className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Admin Users</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Manage admin accounts</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
