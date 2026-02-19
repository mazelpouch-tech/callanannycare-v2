import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  nannies as initialNannies,
  initialBookings,
} from "../data/initialData";
import { isToday, parseISO } from "date-fns";

const DataContext = createContext(null);

const STORAGE_KEYS = {
  nannies: "callanannycare_nannies",
  bookings: "callanannycare_bookings",
  admin: "callanannycare_admin",
};

const ADMIN_CREDENTIALS = {
  email: "admin@callananny.ma",
  password: "admin123",
};

function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
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

  // Persist nannies to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.nannies, nannies);
  }, [nannies]);

  // Persist bookings to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.bookings, bookings);
  }, [bookings]);

  // Persist admin auth to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.admin, isAdmin);
  }, [isAdmin]);

  // --- Nanny CRUD ---

  const addNanny = useCallback((nanny) => {
    setNannies((prev) => [
      ...prev,
      {
        ...nanny,
        id: prev.length > 0 ? Math.max(...prev.map((n) => n.id)) + 1 : 1,
      },
    ]);
  }, []);

  const updateNanny = useCallback((id, updates) => {
    setNannies((prev) =>
      prev.map((nanny) => (nanny.id === id ? { ...nanny, ...updates } : nanny))
    );
  }, []);

  const deleteNanny = useCallback((id) => {
    setNannies((prev) => prev.filter((nanny) => nanny.id !== id));
  }, []);

  const toggleNannyAvailability = useCallback((id) => {
    setNannies((prev) =>
      prev.map((nanny) =>
        nanny.id === id ? { ...nanny, available: !nanny.available } : nanny
      )
    );
  }, []);

  // --- Booking CRUD ---

  const addBooking = useCallback(
    (booking) => {
      const nanny = nannies.find((n) => n.id === booking.nannyId);
      const newBooking = {
        ...booking,
        id: crypto.randomUUID(),
        nannyName: nanny ? nanny.name : booking.nannyName || "Unknown",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      setBookings((prev) => [...prev, newBooking]);
      return newBooking;
    },
    [nannies]
  );

  const updateBookingStatus = useCallback((id, status) => {
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      console.error(`Invalid booking status: ${status}`);
      return;
    }
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, status } : booking
      )
    );
  }, []);

  const updateBooking = useCallback((id, updates) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, ...updates } : booking
      )
    );
  }, []);

  const deleteBooking = useCallback((id) => {
    setBookings((prev) => prev.filter((booking) => booking.id !== id));
  }, []);

  // --- Admin Auth ---

  const adminLogin = useCallback((email, password) => {
    if (
      email === ADMIN_CREDENTIALS.email &&
      password === ADMIN_CREDENTIALS.password
    ) {
      setIsAdmin(true);
      return { success: true };
    }
    return { success: false, error: "Invalid email or password" };
  }, []);

  const adminLogout = useCallback(() => {
    setIsAdmin(false);
  }, []);

  // --- Computed Stats ---

  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(
      (b) => b.status === "pending"
    ).length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === "confirmed"
    ).length;
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

    return {
      totalBookings,
      pendingBookings,
      confirmedBookings,
      totalRevenue,
      todayBookings,
    };
  }, [bookings]);

  const value = useMemo(
    () => ({
      // Nannies
      nannies,
      addNanny,
      updateNanny,
      deleteNanny,
      toggleNannyAvailability,

      // Bookings
      bookings,
      addBooking,
      updateBooking,
      updateBookingStatus,
      deleteBooking,

      // Stats
      stats,

      // Admin Auth
      isAdmin,
      adminLogin,
      adminLogout,
    }),
    [
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
