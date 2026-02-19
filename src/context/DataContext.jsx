import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  nannies as initialNannies,
  initialBookings,
} from "../data/initialData";
import { isToday, parseISO } from "date-fns";

const DataContext = createContext(null);

const API_BASE = "/api";

const STORAGE_KEYS = {
  nannies: "callanannycare_nannies",
  bookings: "callanannycare_bookings",
  admin: "callanannycare_admin",
  nanny: "callanannycare_nanny",
  nannyProfile: "callanannycare_nanny_profile",
};

function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  return fallback;
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API fetch ${path} failed:`, error);
    throw error;
  }
}

export function DataProvider({ children }) {
  const [nannies, setNannies] = useState(() =>
    loadFromStorage(STORAGE_KEYS.nannies, initialNannies)
  );
  const [bookings, setBookings] = useState(() =>
    loadFromStorage(STORAGE_KEYS.bookings, initialBookings)
  );
  const [isAdmin, setIsAdmin] = useState(() =>
    loadFromStorage(STORAGE_KEYS.admin, false)
  );
  const [loading, setLoading] = useState(true);

  // Nanny portal state
  const [isNanny, setIsNanny] = useState(() =>
    loadFromStorage(STORAGE_KEYS.nanny, false)
  );
  const [nannyProfile, setNannyProfile] = useState(() =>
    loadFromStorage(STORAGE_KEYS.nannyProfile, null)
  );
  const [nannyBookings, setNannyBookings] = useState([]);
  const [nannyNotifications, setNannyNotifications] = useState([]);
  const [nannyStats, setNannyStats] = useState(null);

  // Fetch data from API on mount
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [apiNannies, apiBookings] = await Promise.all([
          apiFetch("/nannies"),
          apiFetch("/bookings"),
        ]);

        if (!cancelled) {
          // Normalize nanny data from DB (JSONB fields come as objects already)
          const normalizedNannies = apiNannies.map((n) => ({
            ...n,
            status: n.status || "active",
            specialties: typeof n.specialties === "string" ? JSON.parse(n.specialties) : n.specialties || [],
            languages: typeof n.languages === "string" ? JSON.parse(n.languages) : n.languages || [],
          }));
          setNannies(normalizedNannies);
          saveToStorage(STORAGE_KEYS.nannies, normalizedNannies);

          // Normalize bookings - map DB column names to frontend camelCase
          const normalizedBookings = apiBookings.map((b) => ({
            id: b.id,
            nannyId: b.nanny_id,
            nannyName: b.nanny_name || b.client_name,
            nannyImage: b.nanny_image || "",
            clientName: b.client_name,
            clientEmail: b.client_email,
            clientPhone: b.client_phone,
            hotel: b.hotel,
            date: b.date,
            startTime: b.start_time,
            endTime: b.end_time,
            plan: b.plan,
            childrenCount: b.children_count,
            childrenAges: b.children_ages,
            notes: b.notes,
            totalPrice: b.total_price,
            status: b.status,
            createdAt: b.created_at,
            clockIn: b.clock_in,
            clockOut: b.clock_out,
          }));
          setBookings(normalizedBookings);
          saveToStorage(STORAGE_KEYS.bookings, normalizedBookings);
        }
      } catch (error) {
        console.warn("API unavailable, using localStorage cache:", error.message);
        // Keep localStorage data as fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Persist admin auth to localStorage (admin stays local)
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.admin, isAdmin);
  }, [isAdmin]);

  // Persist nanny auth to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.nanny, isNanny);
  }, [isNanny]);

  // --- Nanny CRUD ---

  const addNanny = useCallback(async (nanny) => {
    try {
      const created = await apiFetch("/nannies", {
        method: "POST",
        body: JSON.stringify(nanny),
      });
      const normalized = {
        ...created,
        specialties: typeof created.specialties === "string" ? JSON.parse(created.specialties) : created.specialties || [],
        languages: typeof created.languages === "string" ? JSON.parse(created.languages) : created.languages || [],
      };
      setNannies((prev) => {
        const updated = [...prev, normalized];
        saveToStorage(STORAGE_KEYS.nannies, updated);
        return updated;
      });
      return normalized;
    } catch {
      // Fallback to local
      const newNanny = {
        ...nanny,
        id: nannies.length > 0 ? Math.max(...nannies.map((n) => n.id)) + 1 : 1,
      };
      setNannies((prev) => {
        const updated = [...prev, newNanny];
        saveToStorage(STORAGE_KEYS.nannies, updated);
        return updated;
      });
      return newNanny;
    }
  }, [nannies]);

  const updateNanny = useCallback(async (id, updates) => {
    try {
      await apiFetch(`/nannies/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    } catch {
      console.warn("API update failed, updating locally");
    }
    setNannies((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, ...updates } : n));
      saveToStorage(STORAGE_KEYS.nannies, updated);
      return updated;
    });
  }, []);

  const deleteNanny = useCallback(async (id) => {
    try {
      await apiFetch(`/nannies/${id}`, { method: "DELETE" });
    } catch {
      console.warn("API delete failed, deleting locally");
    }
    setNannies((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveToStorage(STORAGE_KEYS.nannies, updated);
      return updated;
    });
  }, []);

  const toggleNannyAvailability = useCallback(async (id) => {
    const nanny = nannies.find((n) => n.id === id);
    if (!nanny) return;
    const newAvailable = !nanny.available;
    try {
      await apiFetch(`/nannies/${id}`, {
        method: "PUT",
        body: JSON.stringify({ available: newAvailable }),
      });
    } catch {
      console.warn("API toggle failed, toggling locally");
    }
    setNannies((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, available: newAvailable } : n
      );
      saveToStorage(STORAGE_KEYS.nannies, updated);
      return updated;
    });
  }, [nannies]);

  // --- Booking CRUD ---

  const addBooking = useCallback(
    async (booking) => {
      const nanny = nannies.find((n) => n.id === booking.nannyId);
      try {
        const created = await apiFetch("/bookings", {
          method: "POST",
          body: JSON.stringify({
            nanny_id: booking.nannyId,
            client_name: booking.clientName,
            client_email: booking.clientEmail,
            client_phone: booking.clientPhone || "",
            hotel: booking.hotel || "",
            date: booking.date,
            start_time: booking.startTime,
            end_time: booking.endTime || "",
            plan: booking.plan || "hourly",
            children_count: booking.childrenCount || 1,
            children_ages: booking.childrenAges || "",
            notes: booking.notes || "",
            total_price: booking.totalPrice || 0,
          }),
        });

        const normalized = {
          id: created.id,
          nannyId: created.nanny_id,
          nannyName: nanny ? nanny.name : "Unknown",
          clientName: created.client_name,
          clientEmail: created.client_email,
          clientPhone: created.client_phone,
          hotel: created.hotel,
          date: created.date,
          startTime: created.start_time,
          endTime: created.end_time,
          plan: created.plan,
          childrenCount: created.children_count,
          childrenAges: created.children_ages,
          notes: created.notes,
          totalPrice: created.total_price,
          status: created.status,
          createdAt: created.created_at,
        };
        setBookings((prev) => {
          const updated = [...prev, normalized];
          saveToStorage(STORAGE_KEYS.bookings, updated);
          return updated;
        });
        return normalized;
      } catch {
        // Fallback to local
        const newBooking = {
          ...booking,
          id: crypto.randomUUID(),
          nannyName: nanny ? nanny.name : booking.nannyName || "Unknown",
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        setBookings((prev) => {
          const updated = [...prev, newBooking];
          saveToStorage(STORAGE_KEYS.bookings, updated);
          return updated;
        });
        return newBooking;
      }
    },
    [nannies]
  );

  const updateBookingStatus = useCallback(async (id, status) => {
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      console.error(`Invalid booking status: ${status}`);
      return;
    }
    try {
      await apiFetch(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    } catch {
      console.warn("API status update failed, updating locally");
    }
    setBookings((prev) => {
      const updated = prev.map((b) =>
        b.id === id ? { ...b, status } : b
      );
      saveToStorage(STORAGE_KEYS.bookings, updated);
      return updated;
    });
  }, []);

  const updateBooking = useCallback(async (id, updates) => {
    try {
      await apiFetch(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    } catch {
      console.warn("API update failed, updating locally");
    }
    setBookings((prev) => {
      const updated = prev.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      );
      saveToStorage(STORAGE_KEYS.bookings, updated);
      return updated;
    });
  }, []);

  const clockInBooking = useCallback(async (id) => {
    const clockTime = new Date().toISOString();
    try {
      await apiFetch(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({ clock_in: clockTime }),
      });
    } catch {
      console.warn("API clock-in failed, updating locally");
    }
    setBookings((prev) => {
      const updated = prev.map((b) => b.id === id ? { ...b, clockIn: clockTime } : b);
      saveToStorage(STORAGE_KEYS.bookings, updated);
      return updated;
    });
    // Also update nanny bookings
    setNannyBookings((prev) => prev.map((b) => b.id === id ? { ...b, clockIn: clockTime } : b));
  }, []);

  const clockOutBooking = useCallback(async (id) => {
    const clockTime = new Date().toISOString();
    try {
      await apiFetch(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({ clock_out: clockTime, status: "completed" }),
      });
    } catch {
      console.warn("API clock-out failed, updating locally");
    }
    setBookings((prev) => {
      const updated = prev.map((b) => b.id === id ? { ...b, clockOut: clockTime, status: "completed" } : b);
      saveToStorage(STORAGE_KEYS.bookings, updated);
      return updated;
    });
    // Also update nanny bookings
    setNannyBookings((prev) => prev.map((b) => b.id === id ? { ...b, clockOut: clockTime, status: "completed" } : b));
  }, []);

  const deleteBooking = useCallback(async (id) => {
    try {
      await apiFetch(`/bookings/${id}`, { method: "DELETE" });
    } catch {
      console.warn("API delete failed, deleting locally");
    }
    setBookings((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      saveToStorage(STORAGE_KEYS.bookings, updated);
      return updated;
    });
  }, []);

  // --- Nanny Portal Auth & Data ---

  const nannyLogin = useCallback(async (email, pin) => {
    try {
      const result = await apiFetch("/nanny/login", {
        method: "POST",
        body: JSON.stringify({ email, pin }),
      });
      if (result.success) {
        setIsNanny(true);
        setNannyProfile({ ...result.nanny, status: result.nanny.status || "active" });
        saveToStorage(STORAGE_KEYS.nannyProfile, { ...result.nanny, status: result.nanny.status || "active" });
        return { success: true };
      }
      return { success: false, error: "Invalid email or PIN" };
    } catch (err) {
      // Pass through server error messages (blocked, invited, etc.)
      return { success: false, error: err.message || "Login failed. Please try again." };
    }
  }, []);

  const nannyLogout = useCallback(() => {
    setIsNanny(false);
    setNannyProfile(null);
    setNannyBookings([]);
    setNannyNotifications([]);
    setNannyStats(null);
    localStorage.removeItem(STORAGE_KEYS.nannyProfile);
  }, []);

  const normalizeBooking = useCallback((b) => ({
    id: b.id,
    nannyId: b.nanny_id,
    nannyName: b.nanny_name || "",
    nannyImage: b.nanny_image || "",
    clientName: b.client_name,
    clientEmail: b.client_email,
    clientPhone: b.client_phone,
    hotel: b.hotel,
    date: b.date,
    startTime: b.start_time,
    endTime: b.end_time,
    plan: b.plan,
    childrenCount: b.children_count,
    childrenAges: b.children_ages,
    notes: b.notes,
    totalPrice: b.total_price,
    status: b.status,
    createdAt: b.created_at,
    clockIn: b.clock_in,
    clockOut: b.clock_out,
  }), []);

  const fetchNannyBookings = useCallback(async () => {
    if (!nannyProfile?.id) return;
    try {
      const data = await apiFetch(`/nanny/bookings?nannyId=${nannyProfile.id}`);
      setNannyBookings(data.map(normalizeBooking));
    } catch {
      console.warn("Failed to fetch nanny bookings");
    }
  }, [nannyProfile, normalizeBooking]);

  const fetchNannyStats = useCallback(async () => {
    if (!nannyProfile?.id) return;
    try {
      const data = await apiFetch(`/nanny/stats?nannyId=${nannyProfile.id}`);
      setNannyStats(data);
    } catch {
      console.warn("Failed to fetch nanny stats");
    }
  }, [nannyProfile]);

  const fetchNannyNotifications = useCallback(async () => {
    if (!nannyProfile?.id) return;
    try {
      const data = await apiFetch(`/nanny/notifications?nannyId=${nannyProfile.id}`);
      setNannyNotifications(data.map((n) => ({
        id: n.id,
        nannyId: n.nanny_id,
        type: n.type,
        title: n.title,
        message: n.message,
        bookingId: n.booking_id,
        isRead: n.is_read,
        createdAt: n.created_at,
      })));
    } catch {
      console.warn("Failed to fetch nanny notifications");
    }
  }, [nannyProfile]);

  const markNotificationsRead = useCallback(async (notificationIds) => {
    try {
      await apiFetch("/nanny/notifications", {
        method: "PUT",
        body: JSON.stringify({ notificationIds }),
      });
      setNannyNotifications((prev) =>
        prev.map((n) => notificationIds.includes(n.id) ? { ...n, isRead: true } : n)
      );
    } catch {
      console.warn("Failed to mark notifications as read");
    }
  }, []);

  const updateNannyProfile = useCallback(async (updates) => {
    if (!nannyProfile?.id) return;
    try {
      const result = await apiFetch("/nanny/profile", {
        method: "PUT",
        body: JSON.stringify({ nannyId: nannyProfile.id, ...updates }),
      });
      const updated = {
        ...nannyProfile,
        ...result,
        specialties: typeof result.specialties === "string" ? JSON.parse(result.specialties) : result.specialties || [],
        languages: typeof result.languages === "string" ? JSON.parse(result.languages) : result.languages || [],
      };
      setNannyProfile(updated);
      saveToStorage(STORAGE_KEYS.nannyProfile, updated);
      // Also update in the nannies list
      setNannies((prev) => {
        const updatedList = prev.map((n) => n.id === nannyProfile.id ? { ...n, ...updated } : n);
        saveToStorage(STORAGE_KEYS.nannies, updatedList);
        return updatedList;
      });
      return { success: true };
    } catch {
      return { success: false, error: "Failed to update profile" };
    }
  }, [nannyProfile]);

  // --- Nanny Invitation & Access Control ---

  const inviteNanny = useCallback(async ({ name, email }) => {
    try {
      const result = await apiFetch("/nanny/invite", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
      if (result.success) {
        const newNanny = {
          id: result.nanny.id,
          name: result.nanny.name,
          email: result.nanny.email,
          status: "invited",
          location: "",
          rating: 4.8,
          bio: "",
          specialties: [],
          languages: [],
          rate: 150,
          image: "",
          experience: "",
          available: false,
          pin: "",
        };
        setNannies((prev) => {
          const updated = [...prev, newNanny];
          saveToStorage(STORAGE_KEYS.nannies, updated);
          return updated;
        });
        return { success: true, inviteLink: result.inviteLink, nanny: newNanny };
      }
      return { success: false, error: result.error || "Failed to create invitation" };
    } catch (err) {
      return { success: false, error: err.message || "Failed to create invitation" };
    }
  }, []);

  const toggleNannyStatus = useCallback(async (id) => {
    const nanny = nannies.find((n) => n.id === id);
    if (!nanny || nanny.status === "invited") return;

    const newStatus = nanny.status === "active" ? "blocked" : "active";
    try {
      await apiFetch(`/nannies/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      console.warn("API status toggle failed, toggling locally");
    }
    setNannies((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, status: newStatus } : n
      );
      saveToStorage(STORAGE_KEYS.nannies, updated);
      return updated;
    });
  }, [nannies]);

  const resendInvite = useCallback(async (nannyId) => {
    try {
      const result = await apiFetch("/nanny/invite", {
        method: "PUT",
        body: JSON.stringify({ nannyId }),
      });
      if (result.success) {
        return { success: true, inviteLink: result.inviteLink };
      }
      return { success: false, error: result.error || "Failed to resend invitation" };
    } catch (err) {
      return { success: false, error: err.message || "Failed to resend invitation" };
    }
  }, []);

  // --- Admin Auth & User Management ---

  const [adminProfile, setAdminProfile] = useState(() =>
    loadFromStorage("callanannycare_admin_profile", null)
  );
  const [adminUsers, setAdminUsers] = useState([]);

  // Persist admin profile
  useEffect(() => {
    if (adminProfile) {
      saveToStorage("callanannycare_admin_profile", adminProfile);
    } else {
      localStorage.removeItem("callanannycare_admin_profile");
    }
  }, [adminProfile]);

  const adminLogin = useCallback(async (email, password) => {
    try {
      const result = await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.success) {
        setIsAdmin(true);
        setAdminProfile(result.admin);
        return { success: true };
      }
      return { success: false, error: "Invalid email or password" };
    } catch (err) {
      return { success: false, error: err.message || "Invalid email or password" };
    }
  }, []);

  const adminLogout = useCallback(() => {
    setIsAdmin(false);
    setAdminProfile(null);
    setAdminUsers([]);
  }, []);

  const fetchAdminUsers = useCallback(async () => {
    try {
      const data = await apiFetch("/admin/login");
      setAdminUsers(data);
      return data;
    } catch {
      console.warn("Failed to fetch admin users");
      return [];
    }
  }, []);

  const addAdminUser = useCallback(async ({ name, email, password }) => {
    try {
      const result = await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "add_user", name, email, password }),
      });
      if (result.success) {
        setAdminUsers((prev) => [...prev, result.admin]);
        return { success: true, admin: result.admin };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err.message || "Failed to add admin" };
    }
  }, []);

  const updateAdminUser = useCallback(async (adminId, updates) => {
    try {
      const result = await apiFetch("/admin/login", {
        method: "PUT",
        body: JSON.stringify({ adminId, ...updates }),
      });
      if (result.success) {
        setAdminUsers((prev) =>
          prev.map((a) => (a.id === adminId ? result.admin : a))
        );
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err.message || "Failed to update admin" };
    }
  }, []);

  const deleteAdminUser = useCallback(async (adminId) => {
    try {
      const result = await apiFetch("/admin/login", {
        method: "DELETE",
        body: JSON.stringify({ adminId }),
      });
      if (result.success) {
        setAdminUsers((prev) => prev.filter((a) => a.id !== adminId));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err.message || "Failed to delete admin" };
    }
  }, []);

  const changeAdminPassword = useCallback(async (adminId, currentPassword, newPassword) => {
    try {
      const result = await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "change_password", adminId, currentPassword, newPassword }),
      });
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err.message || "Failed to change password" };
    }
  }, []);

  const forgotAdminPassword = useCallback(async (email) => {
    try {
      const result = await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "forgot_password", email }),
      });
      return { success: true, message: result.message, resetLink: result.resetLink };
    } catch (err) {
      return { success: false, error: err.message || "Failed to process request" };
    }
  }, []);

  const resetAdminPassword = useCallback(async (resetToken, newPassword) => {
    try {
      const result = await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "reset_password", resetToken, newPassword }),
      });
      if (result.success) {
        return { success: true, message: result.message };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err.message || "Failed to reset password" };
    }
  }, []);

  // --- Computed Stats ---

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter((b) => b.status === "pending").length;
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
    const totalRevenue = bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const todayBookings = bookings.filter((b) => {
      try {
        return isToday(parseISO(b.date));
      } catch {
        return false;
      }
    }).length;

    return { totalBookings, pendingBookings, confirmedBookings, totalRevenue, todayBookings };
  }, [bookings]);

  const unreadNotifications = useMemo(
    () => nannyNotifications.filter((n) => !n.isRead).length,
    [nannyNotifications]
  );

  const value = useMemo(
    () => ({
      nannies,
      addNanny,
      updateNanny,
      deleteNanny,
      toggleNannyAvailability,
      inviteNanny,
      toggleNannyStatus,
      resendInvite,
      bookings,
      addBooking,
      updateBooking,
      updateBookingStatus,
      clockInBooking,
      clockOutBooking,
      deleteBooking,
      stats,
      isAdmin,
      adminProfile,
      adminUsers,
      adminLogin,
      adminLogout,
      fetchAdminUsers,
      addAdminUser,
      updateAdminUser,
      deleteAdminUser,
      changeAdminPassword,
      forgotAdminPassword,
      resetAdminPassword,
      loading,
      // Nanny portal
      isNanny,
      nannyProfile,
      nannyBookings,
      nannyNotifications,
      nannyStats,
      unreadNotifications,
      nannyLogin,
      nannyLogout,
      fetchNannyBookings,
      fetchNannyStats,
      fetchNannyNotifications,
      markNotificationsRead,
      updateNannyProfile,
    }),
    [
      nannies, addNanny, updateNanny, deleteNanny, toggleNannyAvailability, inviteNanny, toggleNannyStatus, resendInvite,
      bookings, addBooking, updateBooking, updateBookingStatus, clockInBooking, clockOutBooking, deleteBooking,
      stats, isAdmin, adminProfile, adminUsers, adminLogin, adminLogout,
      fetchAdminUsers, addAdminUser, updateAdminUser, deleteAdminUser,
      changeAdminPassword, forgotAdminPassword, resetAdminPassword, loading,
      isNanny, nannyProfile, nannyBookings, nannyNotifications, nannyStats,
      unreadNotifications, nannyLogin, nannyLogout, fetchNannyBookings,
      fetchNannyStats, fetchNannyNotifications, markNotificationsRead, updateNannyProfile,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

export default DataContext;
