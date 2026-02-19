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

  // --- Admin Auth ---

  const adminLogin = useCallback(async (email, password) => {
    try {
      const result = await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.success) {
        setIsAdmin(true);
        return { success: true };
      }
      return { success: false, error: "Invalid email or password" };
    } catch {
      // Fallback to local check
      if (email === "admin@callananny.ma" && password === "admin123") {
        setIsAdmin(true);
        return { success: true };
      }
      return { success: false, error: "Invalid email or password" };
    }
  }, []);

  const adminLogout = useCallback(() => {
    setIsAdmin(false);
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

  const value = useMemo(
    () => ({
      nannies,
      addNanny,
      updateNanny,
      deleteNanny,
      toggleNannyAvailability,
      bookings,
      addBooking,
      updateBooking,
      updateBookingStatus,
      deleteBooking,
      stats,
      isAdmin,
      adminLogin,
      adminLogout,
      loading,
    }),
    [
      nannies, addNanny, updateNanny, deleteNanny, toggleNannyAvailability,
      bookings, addBooking, updateBooking, updateBookingStatus, deleteBooking,
      stats, isAdmin, adminLogin, adminLogout, loading,
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
