import { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, Shield, User,
  CheckCircle, XCircle, Key, RotateCcw, Loader2,
} from "lucide-react";
import type { LoginLog } from "@/types";

const ACTION_BADGES: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  login_success: { label: "Login Success", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  login_failed: { label: "Login Failed", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  password_change: { label: "Password Change", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Key },
  password_reset: { label: "Password Reset", color: "bg-amber-50 text-amber-700 border-amber-200", icon: RotateCcw },
  pin_change: { label: "PIN Change", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Key },
};

const USER_TYPE_ICONS: Record<string, { icon: typeof Shield; color: string }> = {
  admin: { icon: Shield, color: "text-purple-600" },
  nanny: { icon: User, color: "text-orange-600" },
};

export default function AdminLoginLogs() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (userTypeFilter !== "all") params.set("userType", userTypeFilter);
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (search.trim()) params.set("search", search.trim());

      const resp = await fetch(`/api/admin/login-logs?${params}`);
      const data = await resp.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to fetch login logs");
    } finally {
      setLoading(false);
    }
  }, [page, userTypeFilter, actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [userTypeFilter, actionFilter, search]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Login Logs</h1>
        <p className="text-muted-foreground mt-1">
          Audit trail of all login attempts, password changes, and PIN updates
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
          />
        </div>
        <select
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-background"
        >
          <option value="all">All Users</option>
          <option value="admin">Admin</option>
          <option value="nanny">Nanny</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-background"
        >
          <option value="all">All Actions</option>
          <option value="login_success">Login Success</option>
          <option value="login_failed">Login Failed</option>
          <option value="password_change">Password Change</option>
          <option value="password_reset">Password Reset</option>
          <option value="pin_change">PIN Change</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {total} log{total !== 1 ? "s" : ""} found
      </p>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No login logs found
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-xl overflow-hidden bg-white">
            <table className="w-full">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => {
                  const badge = ACTION_BADGES[log.action] || ACTION_BADGES.login_success;
                  const Badge = badge.icon;
                  const typeInfo = USER_TYPE_ICONS[log.userType] || USER_TYPE_ICONS.nanny;
                  const TypeIcon = typeInfo.icon;
                  return (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{log.userName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{log.userEmail || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${typeInfo.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {log.userType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>
                          <Badge className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.details || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {log.ipAddress || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => {
              const badge = ACTION_BADGES[log.action] || ACTION_BADGES.login_success;
              const Badge = badge.icon;
              return (
                <div key={log.id} className="border rounded-xl p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>
                      <Badge className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{log.userName || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{log.userEmail || "—"}</div>
                  </div>
                  {log.details && (
                    <div className="text-xs text-muted-foreground">{log.details}</div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{log.userType}</span>
                    {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border rounded-lg hover:bg-muted/40 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border rounded-lg hover:bg-muted/40 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
