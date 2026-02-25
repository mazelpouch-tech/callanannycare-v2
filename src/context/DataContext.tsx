import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  nannies as initialNannies,
  initialBookings,
} from "../data/initialData";
import { isToday, parseISO } from "date-fns";
import type {
  Nanny,
  Booking,
  Notification,
  NannyProfile,
  NannyStats,
  AdminProfile,
  AdminUser,
  DashboardStats,
  BookingStatus,
  ChatMessage,
  ChatChannel,
  DataContextValue,
} from "../types";
import type {
  DbNanny,
  DbBookingWithNanny,
  DbNotification,
  DbChatMessage,
  DbChatChannel,
  NannyLoginResponse,
  AdminLoginResponse,
  LinkedNannyInfo,
  InviteResponse,
  ResendInviteResponse,
  ApiResult,
} from "../types";

const DataContext = createContext<DataContextValue | null>(null);

const API_BASE = "/api";

const STORAGE_KEYS = {
  nannies: "callanannycare_nannies",
  bookings: "callanannycare_bookings",
  admin: "callanannycare_admin",
  nanny: "callanannycare_nanny",
  nannyProfile: "callanannycare_nanny_profile",
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  return fallback;
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

export class ApiError extends Error {
  status: number;
  conflicts?: { bookingId: number; date: string; startTime: string; endTime: string; clientName: string }[];
  constructor(message: string, status: number, conflicts?: ApiError['conflicts']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.conflicts = conflicts;
  }
}

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.error || `API error ${res.status}`, res.status, err.conflicts);
    }
    return await res.json();
  } catch (error) {
    console.error(`API fetch ${path} failed:`, error);
    throw error;
  }
}

interface DataProviderProps {
  children: React.ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [nannies, setNannies] = useState<Nanny[]>(() =>
    loadFromStorage(STORAGE_KEYS.nannies, initialNannies)
  );
  const [bookings, setBookings] = useState<Booking[]>(() =>
    loadFromStorage(STORAGE_KEYS.bookings, initialBookings)
  );
  const [isAdmin, setIsAdmin] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.admin, false)
  );
  const [loading, setLoading] = useState(true);

  // Nanny portal state
  const [isNanny, setIsNanny] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.nanny, false)
  );
  const [nannyProfile, setNannyProfile] = useState<NannyProfile | null>(() =>
    loadFromStorage(STORAGE_KEYS.nannyProfile, null)
  );
  const [nannyBookings, setNannyBookings] = useState<Booking[]>([]);
  const [nannyNotifications, setNannyNotifications] = useState<Notification[]>([]);
  const [nannyStats, setNannyStats] = useState<NannyStats | null>(null);

  // Fetch data from API on mount
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [apiNannies, apiBookings] = await Promise.all([
          apiFetch<DbNanny[]>("/nannies"),
          apiFetch<DbBookingWithNanny[]>("/bookings"),
        ]);

        if (!cancelled) {
          // Normalize nanny data from DB (JSONB fields come as objects already)
          const normalizedNannies: Nanny[] = apiNannies.map((n) => ({
            ...n,
            status: n.status || "active",
            specialties: typeof n.specialties === "string" ? JSON.parse(n.specialties) : n.specialties || [],
            languages: typeof n.languages === "string" ? JSON.parse(n.languages) : n.languages || [],
          }));
          setNannies(normalizedNannies);
          saveToStorage(STORAGE_KEYS.nannies, normalizedNannies);

          // Normalize bookings - map DB column names to frontend camelCase
          const normalizedBookings: Booking[] = apiBookings.map((b) => ({
            id: b.id,
            nannyId: b.nanny_id,
            nannyName: b.nanny_name || b.client_name,
            nannyImage: b.nanny_image || "",
            clientName: b.client_name,
            clientEmail: b.client_email,
            clientPhone: b.client_phone,
            hotel: b.hotel,
            date: b.date,
            endDate: b.end_date ?? null,
            startTime: b.start_time,
            endTime: b.end_time,
            plan: b.plan,
            childrenCount: b.children_count,
            childrenAges: b.children_ages,
            notes: b.notes,
            totalPrice: b.total_price,
            status: b.status,
            createdBy: b.created_by || 'parent',
            createdByName: b.created_by_name || '',
            createdAt: b.created_at,
            clockIn: b.clock_in,
            clockOut: b.clock_out,
            cancelledAt: b.cancelled_at ?? null,
            cancellationReason: b.cancellation_reason || '',
            cancelledBy: b.cancelled_by || '',
            collectedBy: b.collected_by || '',
            collectedAt: b.collected_at ?? null,
            collectionNote: b.collection_note || '',
            paymentMethod: b.payment_method || '',
            createdBy: b.created_by || '',
          }));
          setBookings(normalizedBookings);
          saveToStorage(STORAGE_KEYS.bookings, normalizedBookings);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn("API unavailable, using localStorage cache:", message);
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

  const addNanny = useCallback(async (nanny: Partial<Nanny>): Promise<Nanny> => {
    try {
      const created = await apiFetch<DbNanny>("/nannies", {
        method: "POST",
        body: JSON.stringify(nanny),
      });
      const normalized: Nanny = {
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
      } as Nanny;
      setNannies((prev) => {
        const updated = [...prev, newNanny];
        saveToStorage(STORAGE_KEYS.nannies, updated);
        return updated;
      });
      return newNanny;
    }
  }, [nannies]);

  const updateNanny = useCallback(async (id: number, updates: Partial<Nanny>): Promise<void> => {
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

  const deleteNanny = useCallback(async (id: number): Promise<void> => {
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

  const toggleNannyAvailability = useCallback(async (id: number): Promise<void> => {
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

  const fetchBookings = useCallback(async () => {
    try {
      const apiBookings = await apiFetch<DbBookingWithNanny[]>("/bookings");
      const normalizedBookings: Booking[] = apiBookings.map((b) => ({
        id: b.id,
        nannyId: b.nanny_id,
        nannyName: b.nanny_name || b.client_name,
        nannyImage: b.nanny_image || "",
        clientName: b.client_name,
        clientEmail: b.client_email,
        clientPhone: b.client_phone,
        hotel: b.hotel,
        date: b.date,
        endDate: b.end_date ?? null,
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
        cancelledAt: b.cancelled_at ?? null,
        cancellationReason: b.cancellation_reason || '',
        cancelledBy: b.cancelled_by || '',
        collectedBy: b.collected_by || '',
        collectedAt: b.collected_at ?? null,
        collectionNote: b.collection_note || '',
        paymentMethod: b.payment_method || '',
        createdBy: b.created_by || '',
      }));
      setBookings(normalizedBookings);
      saveToStorage(STORAGE_KEYS.bookings, normalizedBookings);
    } catch {
      console.warn("Failed to refresh bookings");
    }
  }, []);

  const addBooking = useCallback(
    async (booking: Partial<Booking>, meta?: { locale?: string }): Promise<Booking> => {
      const nanny = nannies.find((n) => n.id === booking.nannyId);
      try {
        const created = await apiFetch<DbBookingWithNanny>("/bookings", {
          method: "POST",
          body: JSON.stringify({
            nanny_id: booking.nannyId,
            client_name: booking.clientName,
            client_email: booking.clientEmail,
            client_phone: booking.clientPhone || "",
            hotel: booking.hotel || "",
            date: booking.date,
            end_date: booking.endDate || null,
            start_time: booking.startTime || "",
            end_time: booking.endTime || "",
            plan: booking.plan || "hourly",
            children_count: booking.childrenCount || 1,
            children_ages: booking.childrenAges || "",
            notes: booking.notes || "",
            total_price: booking.totalPrice || 0,
            locale: meta?.locale || "en",
            status: booking.status || undefined,
            clock_in: booking.clockIn || null,
            clock_out: booking.clockOut || null,
            created_by: booking.createdBy || "parent",
            created_by_name: booking.createdByName || "",
          }),
        });

        const normalized: Booking = {
          id: created.id,
          nannyId: created.nanny_id,
          nannyName: nanny ? nanny.name : "Unknown",
          nannyImage: created.nanny_image || '',
          clientName: created.client_name,
          clientEmail: created.client_email,
          clientPhone: created.client_phone,
          hotel: created.hotel,
          date: created.date,
          endDate: created.end_date ?? null,
          startTime: created.start_time,
          endTime: created.end_time,
          plan: created.plan,
          childrenCount: created.children_count,
          childrenAges: created.children_ages,
          notes: created.notes,
          totalPrice: created.total_price,
          status: created.status,
          createdBy: created.created_by || 'parent',
          createdByName: created.created_by_name || '',
          createdAt: created.created_at,
          clockIn: created.clock_in ?? null,
          clockOut: created.clock_out ?? null,
          cancelledAt: created.cancelled_at ?? null,
          cancellationReason: created.cancellation_reason || '',
          cancelledBy: created.cancelled_by || '',
          collectedBy: created.collected_by || '',
          collectedAt: created.collected_at ?? null,
          collectionNote: created.collection_note || '',
          paymentMethod: created.payment_method || '',
          createdBy: created.created_by || '',
        };
        setBookings((prev) => {
          const updated = [...prev, normalized];
          saveToStorage(STORAGE_KEYS.bookings, updated);
          return updated;
        });
        return normalized;
      } catch {
        // Fallback to local
        const newBooking: Booking = {
          ...booking,
          id: crypto.randomUUID(),
          nannyName: nanny ? nanny.name : booking.nannyName || "Unknown",
          status: booking.status || "pending",
          createdBy: booking.createdBy || "parent",
          createdByName: booking.createdByName || "",
          createdAt: new Date().toISOString(),
          createdBy: booking.createdBy || (adminProfile ? `Admin (${adminProfile.name})` : nannyProfile ? `Nanny (${nannyProfile.name})` : "Parent"),
        } as Booking;
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

  const updateBookingStatus = useCallback(async (
    id: number | string,
    status: BookingStatus,
    meta?: { reason?: string; cancelledBy?: string }
  ): Promise<void> => {
    const validStatuses: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      console.error(`Invalid booking status: ${status}`);
      return;
    }
    try {
      await apiFetch(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          ...(status === "cancelled" && meta ? {
            cancellation_reason: meta.reason || "",
            cancelled_by: meta.cancelledBy || "admin",
          } : {}),
        }),
      });
    } catch {
      console.warn("API status update failed, updating locally");
    }
    setBookings((prev) => {
      const updated = prev.map((b) =>
        b.id === id ? {
          ...b,
          status,
          ...(status === "cancelled" ? {
            cancelledAt: new Date().toISOString(),
            cancellationReason: meta?.reason || "",
            cancelledBy: meta?.cancelledBy || "",
          } : {}),
        } : b
      );
      saveToStorage(STORAGE_KEYS.bookings, updated);
      return updated;
    });
  }, []);

  const updateBooking = useCallback(async (id: number | string, updates: Partial<Booking>): Promise<void> => {
    // Map camelCase to snake_case for API
    const apiBody: Record<string, unknown> = {};
    if (updates.nannyId !== undefined) apiBody.nanny_id = updates.nannyId;
    if (updates.clientName !== undefined) apiBody.client_name = updates.clientName;
    if (updates.clientEmail !== undefined) apiBody.client_email = updates.clientEmail;
    if (updates.clientPhone !== undefined) apiBody.client_phone = updates.clientPhone;
    if (updates.hotel !== undefined) apiBody.hotel = updates.hotel;
    if (updates.date !== undefined) apiBody.date = updates.date;
    if (updates.endDate !== undefined) apiBody.end_date = updates.endDate;
    if (updates.startTime !== undefined) apiBody.start_time = updates.startTime;
    if (updates.endTime !== undefined) apiBody.end_time = updates.endTime;
    if (updates.plan !== undefined) apiBody.plan = updates.plan;
    if (updates.childrenCount !== undefined) apiBody.children_count = updates.childrenCount;
    if (updates.childrenAges !== undefined) apiBody.children_ages = updates.childrenAges;
    if (updates.notes !== undefined) apiBody.notes = updates.notes;
    if (updates.totalPrice !== undefined) apiBody.total_price = updates.totalPrice;
    if (updates.status !== undefined) apiBody.status = updates.status;
    if (updates.clockIn !== undefined) apiBody.clock_in = updates.clockIn;
    if (updates.clockOut !== undefined) apiBody.clock_out = updates.clockOut;
    try {
      await apiFetch(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify(apiBody),
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

  const clockInBooking = useCallback(async (id: number | string): Promise<void> => {
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

  const clockOutBooking = useCallback(async (id: number | string): Promise<void> => {
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
      const updated = prev.map((b) => b.id === id ? { ...b, clockOut: clockTime, status: "completed" as BookingStatus } : b);
      saveToStorage(STORAGE_KEYS.bookings, updated);
      return updated;
    });
    // Also update nanny bookings
    setNannyBookings((prev) => prev.map((b) => b.id === id ? { ...b, clockOut: clockTime, status: "completed" as BookingStatus } : b));
  }, []);

  const deleteBooking = useCallback(async (id: number | string): Promise<void> => {
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

  const markAsCollected = useCallback(async (
    id: number | string,
    data: { collectedBy: string; paymentMethod: string; collectionNote?: string }
  ): Promise<void> => {
    const collectedAt = new Date().toISOString();
    try {
      await apiFetch(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          collected_by: data.collectedBy,
          collected_at: collectedAt,
          collection_note: data.collectionNote || '',
          payment_method: data.paymentMethod,
        }),
      });
    } catch {
      console.warn("API mark-collected failed, updating locally");
    }
    setBookings((prev) => {
      const updated = prev.map((b) =>
        b.id === id ? {
          ...b,
          collectedBy: data.collectedBy,
          collectedAt: collectedAt,
          collectionNote: data.collectionNote || '',
          paymentMethod: data.paymentMethod,
        } : b
      );
      saveToStorage(STORAGE_KEYS.bookings, updated);
      return updated;
    });
  }, []);

  const resendInvoice = useCallback(async (id: number | string): Promise<void> => {
    await apiFetch(`/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify({ resend_invoice: true }),
    });
  }, []);

  const sendBookingReminder = useCallback(async (id: number | string): Promise<void> => {
    await apiFetch(`/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify({ send_reminder: true }),
    });
  }, []);


  // --- Nanny Portal Auth & Data ---

  const nannyLogin = useCallback(async (email: string, pin: string) => {
    try {
      const result = await apiFetch<ApiResult<NannyLoginResponse>>("/nanny/login", {
        method: "POST",
        body: JSON.stringify({ email, pin }),
      });
      if (result.success) {
        const n = result.nanny;
        const profile: NannyProfile = {
          id: n.id,
          name: n.name,
          email: n.email ?? '',
          image: n.image,
          location: n.location,
          rating: n.rating,
          experience: n.experience,
          status: n.status || "active",
          bio: n.bio,
          specialties: typeof n.specialties === "string" ? JSON.parse(n.specialties) : n.specialties || [],
          languages: typeof n.languages === "string" ? JSON.parse(n.languages) : n.languages || [],
          rate: n.rate,
          available: n.available,
          phone: n.phone,
          age: n.age ?? null,
        };
        setIsNanny(true);
        setNannyProfile(profile);
        saveToStorage(STORAGE_KEYS.nannyProfile, profile);

        // If this nanny also has a linked admin/supervisor account, activate it too
        if (result.linkedAdmin) {
          const la = result.linkedAdmin;
          const adminProf: AdminProfile = {
            id: la.id,
            name: la.name,
            email: la.email,
            role: la.role,
            lastLogin: la.lastLogin,
            loginCount: la.loginCount,
          };
          setIsAdmin(true);
          setAdminProfile(adminProf);
        }

        // Auto-resubscribe push if permission was previously granted
        try {
          const { isPushSupported, isSubscribedToPush, subscribeToPush } = await import('../utils/pushNotifications');
          if (isPushSupported() && Notification.permission === 'granted') {
            const alreadySub = await isSubscribedToPush();
            if (!alreadySub) await subscribeToPush('nanny', n.id);
          }
        } catch { /* push resubscribe is best-effort */ }

        return { success: true as const };
      }
      return { success: false as const, error: "Invalid email or PIN" };
    } catch (err: unknown) {
      // Pass through server error messages (blocked, invited, etc.)
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Login failed. Please try again." };
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

  const normalizeBooking = useCallback((b: DbBookingWithNanny): Booking => ({
    id: b.id,
    nannyId: b.nanny_id,
    nannyName: b.nanny_name || "",
    nannyImage: b.nanny_image || "",
    clientName: b.client_name,
    clientEmail: b.client_email,
    clientPhone: b.client_phone,
    hotel: b.hotel,
    date: b.date,
    endDate: b.end_date ?? null,
    startTime: b.start_time,
    endTime: b.end_time,
    plan: b.plan,
    childrenCount: b.children_count,
    childrenAges: b.children_ages,
    notes: b.notes,
    totalPrice: b.total_price,
    status: b.status,
    createdBy: b.created_by || 'parent',
    createdByName: b.created_by_name || '',
    createdAt: b.created_at,
    clockIn: b.clock_in,
    clockOut: b.clock_out,
    cancelledAt: b.cancelled_at ?? null,
    cancellationReason: b.cancellation_reason || '',
    cancelledBy: b.cancelled_by || '',
    collectedBy: b.collected_by || '',
    collectedAt: b.collected_at ?? null,
    collectionNote: b.collection_note || '',
    paymentMethod: b.payment_method || '',
    createdBy: b.created_by || '',
  }), []);

  const fetchNannyBookings = useCallback(async () => {
    if (!nannyProfile?.id) return;
    try {
      const data = await apiFetch<DbBookingWithNanny[]>(`/nanny/bookings?nannyId=${nannyProfile.id}`);
      setNannyBookings(data.map(normalizeBooking));
    } catch {
      console.warn("Failed to fetch nanny bookings");
    }
  }, [nannyProfile, normalizeBooking]);

  const fetchNannyStats = useCallback(async () => {
    if (!nannyProfile?.id) return;
    try {
      const data = await apiFetch<NannyStats>(`/nanny/profile?nannyId=${nannyProfile.id}&include=stats`);
      setNannyStats(data);
    } catch {
      console.warn("Failed to fetch nanny stats");
    }
  }, [nannyProfile]);

  const fetchNannyNotifications = useCallback(async () => {
    if (!nannyProfile?.id) return;
    try {
      const data = await apiFetch<DbNotification[]>(`/nanny/profile?nannyId=${nannyProfile.id}&include=notifications`);
      setNannyNotifications(data.map((n): Notification => ({
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

  const markNotificationsRead = useCallback(async (notificationIds: number[]) => {
    try {
      await apiFetch("/nanny/profile", {
        method: "PUT",
        body: JSON.stringify({ nannyId: nannyProfile?.id, action: "mark_notifications_read", notificationIds }),
      });
      setNannyNotifications((prev) =>
        prev.map((n) => notificationIds.includes(n.id) ? { ...n, isRead: true } : n)
      );
    } catch {
      console.warn("Failed to mark notifications as read");
    }
  }, []);

  const updateNannyProfile = useCallback(async (updates: Partial<NannyProfile>) => {
    if (!nannyProfile?.id) return { success: false as const, error: "No profile" };
    try {
      const result = await apiFetch<DbNanny>("/nanny/profile", {
        method: "PUT",
        body: JSON.stringify({ nannyId: nannyProfile.id, ...updates }),
      });
      const updated: NannyProfile = {
        ...nannyProfile,
        id: result.id,
        name: result.name,
        email: result.email ?? nannyProfile.email ?? '',
        image: result.image,
        location: result.location,
        rating: result.rating,
        experience: result.experience,
        status: result.status,
        bio: result.bio,
        rate: result.rate,
        available: result.available,
        phone: result.phone,
        age: result.age ?? null,
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
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Failed to update profile" };
    }
  }, [nannyProfile]);

  // --- Nanny Invitation & Access Control ---

  const inviteNanny = useCallback(async ({ name, email }: { name: string; email: string }) => {
    try {
      const result = await apiFetch<ApiResult<InviteResponse>>("/nanny/invite", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
      if (result.success) {
        const newNanny: Nanny = {
          id: result.nanny.id,
          name: result.nanny.name,
          email: result.nanny.email,
          phone: '',
          age: null,
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
        return { success: true as const, inviteLink: result.inviteLink, emailSent: result.emailSent ?? false, nanny: result.nanny };
      }
      return { success: false as const, error: result.error || "Failed to create invitation" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Failed to create invitation" };
    }
  }, []);

  const toggleNannyStatus = useCallback(async (id: number): Promise<void> => {
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
        n.id === id ? { ...n, status: newStatus as Nanny["status"] } : n
      );
      saveToStorage(STORAGE_KEYS.nannies, updated);
      return updated;
    });
  }, [nannies]);

  const resendInvite = useCallback(async (nannyId: number) => {
    try {
      const result = await apiFetch<ApiResult<ResendInviteResponse>>("/nanny/invite", {
        method: "PUT",
        body: JSON.stringify({ nannyId }),
      });
      if (result.success) {
        return { success: true as const, inviteLink: result.inviteLink as string, emailSent: result.emailSent ?? false };
      }
      return { success: false as const, error: result.error || "Failed to resend invitation" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Failed to resend invitation" };
    }
  }, []);

  // --- Admin Auth & User Management ---

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(() =>
    loadFromStorage("callanannycare_admin_profile", null)
  );
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Persist admin profile
  useEffect(() => {
    if (adminProfile) {
      saveToStorage("callanannycare_admin_profile", adminProfile);
    } else {
      localStorage.removeItem("callanannycare_admin_profile");
    }
  }, [adminProfile]);

  const adminLogin = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiFetch<ApiResult<AdminLoginResponse>>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.success) {
        const a = result.admin;
        const profile: AdminProfile = {
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
          lastLogin: a.last_login,
          loginCount: a.login_count,
        };
        setIsAdmin(true);
        setAdminProfile(profile);

        // If this admin also has a linked nanny account, activate it too
        if (result.linkedNanny) {
          const ln = result.linkedNanny as LinkedNannyInfo;
          const nannyProf: NannyProfile = {
            id: ln.id,
            name: ln.name,
            email: ln.email ?? '',
            image: ln.image,
            location: ln.location,
            rating: ln.rating,
            experience: ln.experience,
            status: ln.status,
            bio: ln.bio,
            specialties: ln.specialties,
            languages: ln.languages,
            rate: ln.rate,
            available: ln.available,
            phone: ln.phone,
            age: ln.age ?? null,
          };
          setIsNanny(true);
          setNannyProfile(nannyProf);
          saveToStorage(STORAGE_KEYS.nannyProfile, nannyProf);
        }

        // Auto-resubscribe push if permission was previously granted
        try {
          const { isPushSupported, isSubscribedToPush, subscribeToPush } = await import('../utils/pushNotifications');
          if (isPushSupported() && Notification.permission === 'granted') {
            const alreadySub = await isSubscribedToPush();
            if (!alreadySub) await subscribeToPush('admin', a.id);
          }
        } catch { /* push resubscribe is best-effort */ }

        return { success: true as const };
      }
      return { success: false as const, error: "Invalid email or password" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Invalid email or password" };
    }
  }, []);

  const adminLogout = useCallback(() => {
    setIsAdmin(false);
    setAdminProfile(null);
    setAdminUsers([]);
  }, []);

  const fetchAdminUsers = useCallback(async (): Promise<AdminUser[]> => {
    try {
      const data = await apiFetch<AdminUser[]>("/admin/login");
      setAdminUsers(data);
      return data;
    } catch {
      console.warn("Failed to fetch admin users");
      return [];
    }
  }, []);

  const addAdminUser = useCallback(async ({ name, email }: { name: string; email: string }) => {
    try {
      const result = await apiFetch<ApiResult<{ admin: AdminUser }>>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "add_user", name, email }),
      });
      if (result.success) {
        setAdminUsers((prev) => [...prev, result.admin]);
        return { success: true as const, admin: result.admin };
      }
      return { success: false as const, error: result.error };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Failed to add admin" };
    }
  }, []);

  const updateAdminUser = useCallback(async (adminId: number, updates: Partial<AdminUser>) => {
    try {
      const result = await apiFetch<ApiResult<{ admin: AdminUser }>>("/admin/login", {
        method: "PUT",
        body: JSON.stringify({ adminId, ...updates }),
      });
      if (result.success) {
        setAdminUsers((prev) =>
          prev.map((a) => (a.id === adminId ? result.admin : a))
        );
        // Also update adminProfile if editing yourself
        if (adminProfile && adminProfile.id === adminId && updates.name) {
          setAdminProfile((prev) => prev ? { ...prev, name: updates.name! } : prev);
        }
        return { success: true as const };
      }
      return { success: false as const, error: result.error || "Failed to update admin" };
    } catch {
      // Fallback: update locally even if API fails
      console.warn("API update failed, updating admin locally");
      setAdminUsers((prev) =>
        prev.map((a) => (a.id === adminId ? { ...a, ...updates } : a))
      );
      if (adminProfile && adminProfile.id === adminId && updates.name) {
        setAdminProfile((prev) => prev ? { ...prev, name: updates.name! } : prev);
      }
      return { success: true as const };
    }
  }, [adminProfile]);

  const deleteAdminUser = useCallback(async (adminId: number) => {
    try {
      const result = await apiFetch<ApiResult>("/admin/login", {
        method: "DELETE",
        body: JSON.stringify({ adminId }),
      });
      if (result.success) {
        setAdminUsers((prev) => prev.filter((a) => a.id !== adminId));
        return { success: true as const };
      }
      return { success: false as const, error: result.error };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Failed to delete admin" };
    }
  }, []);

  const changeAdminPassword = useCallback(async (adminId: number, currentPassword: string, newPassword: string) => {
    try {
      const result = await apiFetch<ApiResult>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "change_password", adminId, currentPassword, newPassword }),
      });
      if (result.success) {
        return { success: true as const };
      }
      return { success: false as const, error: result.error };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Failed to change password" };
    }
  }, []);

  const forgotAdminPassword = useCallback(async (email: string) => {
    try {
      const result = await apiFetch<{ message: string; resetLink?: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "forgot_password", email }),
      });
      return { success: true as const, message: result.message, resetLink: result.resetLink };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Failed to process request" };
    }
  }, []);

  const resetAdminPassword = useCallback(async (resetToken: string, newPassword: string) => {
    try {
      const result = await apiFetch<ApiResult<{ message: string }>>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "reset_password", resetToken, newPassword }),
      });
      if (result.success) {
        return { success: true as const, message: result.message };
      }
      return { success: false as const, error: result.error };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Failed to reset password" };
    }
  }, []);

  const registerAdmin = useCallback(async (registerToken: string, newPassword: string) => {
    try {
      const result = await apiFetch<ApiResult<{ message: string }>>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ action: "register_admin", resetToken: registerToken, newPassword }),
      });
      if (result.success) {
        return { success: true as const, message: result.message };
      }
      return { success: false as const, error: result.error };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false as const, error: message || "Failed to complete registration" };
    }
  }, []);

  // --- Chat Messaging (API-backed) ---

  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const fetchChatChannels = useCallback(async () => {
    try {
      const readerType = isAdmin ? "admin" : "nanny";
      const readerId = isAdmin ? adminProfile?.id : nannyProfile?.id;
      if (!readerId) return;
      const data = await apiFetch<DbChatChannel[]>(`/messages?channel=list&readerType=${readerType}&readerId=${readerId}`);
      setChatChannels(data.map((ch): ChatChannel => ({
        channel: ch.channel,
        lastMessage: ch.last_message,
        lastSender: ch.last_sender,
        lastAt: ch.last_at,
        unreadCount: parseInt(String(ch.unread_count)) || 0,
      })));
    } catch {
      // silent
    }
  }, [isAdmin, adminProfile, nannyProfile]);

  const fetchChatMessages = useCallback(async (channel: string) => {
    try {
      const data = await apiFetch<DbChatMessage[]>(`/messages?channel=${encodeURIComponent(channel)}`);
      setChatMessages((prev) => ({
        ...prev,
        [channel]: data.map((m): ChatMessage => ({
          id: m.id,
          channel: m.channel,
          senderType: m.sender_type,
          senderId: m.sender_id,
          senderName: m.sender_name,
          content: m.content,
          createdAt: m.created_at,
        })),
      }));
    } catch {
      // silent
    }
  }, []);

  const sendChatMessage = useCallback(async (channel: string, content: string) => {
    const senderType = isAdmin ? "admin" : "nanny";
    const senderId = isAdmin ? (adminProfile?.id ?? 0) : (nannyProfile?.id ?? 0);
    const senderName = isAdmin ? (adminProfile?.name ?? "Admin") : (nannyProfile?.name ?? "Nanny");

    try {
      const msg = await apiFetch<DbChatMessage>("/messages", {
        method: "POST",
        body: JSON.stringify({ channel, senderType, senderId, senderName, content }),
      });
      // Append to local state
      setChatMessages((prev) => ({
        ...prev,
        [channel]: [...(prev[channel] || []), {
          id: msg.id,
          channel: msg.channel,
          senderType: msg.sender_type,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          content: msg.content,
          createdAt: msg.created_at,
        }],
      }));
      // Refresh channel list for last message preview
      fetchChatChannels();
    } catch {
      console.warn("Failed to send message");
    }
  }, [isAdmin, adminProfile, nannyProfile, fetchChatChannels]);

  const markChatRead = useCallback(async (channel: string) => {
    const readerType = isAdmin ? "admin" : "nanny";
    const readerId = isAdmin ? (adminProfile?.id ?? 0) : (nannyProfile?.id ?? 0);
    try {
      await apiFetch("/messages", {
        method: "PUT",
        body: JSON.stringify({ channel, readerType, readerId }),
      });
      setChatChannels((prev) => prev.map((ch) =>
        ch.channel === channel ? { ...ch, unreadCount: 0 } : ch
      ));
    } catch {
      // silent
    }
  }, [isAdmin, adminProfile, nannyProfile]);

  // --- Computed Stats ---

  const stats: DashboardStats = useMemo(() => {
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

  const unreadChatCount = useMemo(() => {
    return chatChannels.reduce((sum, ch) => sum + ch.unreadCount, 0);
  }, [chatChannels]);

  const value: DataContextValue = useMemo(
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
      fetchBookings,
      addBooking,
      updateBooking,
      updateBookingStatus,
      clockInBooking,
      clockOutBooking,
      deleteBooking,
      markAsCollected,
      resendInvoice,
      sendBookingReminder,
      stats,
      isAdmin,
      isSupervisor: isAdmin && adminProfile?.role === 'supervisor',
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
      registerAdmin,
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
      // Messaging
      chatChannels,
      chatMessages,
      activeChannel,
      unreadChatCount,
      fetchChatChannels,
      fetchChatMessages,
      sendChatMessage,
      markChatRead,
      setActiveChannel,
    }),
    [
      nannies, addNanny, updateNanny, deleteNanny, toggleNannyAvailability, inviteNanny, toggleNannyStatus, resendInvite,
      bookings, fetchBookings, addBooking, updateBooking, updateBookingStatus, clockInBooking, clockOutBooking, deleteBooking, resendInvoice, sendBookingReminder,
      stats, isAdmin, adminProfile, adminUsers, adminLogin, adminLogout,
      fetchAdminUsers, addAdminUser, updateAdminUser, deleteAdminUser,
      changeAdminPassword, forgotAdminPassword, resetAdminPassword, registerAdmin, loading,
      isNanny, nannyProfile, nannyBookings, nannyNotifications, nannyStats,
      unreadNotifications, nannyLogin, nannyLogout, fetchNannyBookings,
      fetchNannyStats, fetchNannyNotifications, markNotificationsRead, updateNannyProfile,
      chatChannels, chatMessages, activeChannel, unreadChatCount,
      fetchChatChannels, fetchChatMessages, sendChatMessage, markChatRead, setActiveChannel,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

export default DataContext;
