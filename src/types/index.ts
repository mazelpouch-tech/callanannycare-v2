// ============================================================
// Enums / Union Types
// ============================================================

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type BookingPlan = 'hourly' | 'half-day' | 'full-day';
export type BookingCreator = 'parent' | 'nanny' | 'admin';
export type NannyStatus = 'active' | 'blocked' | 'invited';
export type NotificationType = 'new_booking' | 'booking_confirmed' | 'booking_cancelled' | 'booking_completed';
export type AdminRole = 'super_admin' | 'admin' | 'supervisor';
export type MessageSenderType = 'admin' | 'nanny';

// ============================================================
// Database row types (snake_case, as returned from Neon SQL)
// ============================================================

/** Raw nannies table row */
export interface DbNanny {
  id: number;
  name: string;
  location: string;
  rating: number;
  bio: string;
  specialties: string[] | string; // JSONB — driver may return string or parsed array
  languages: string[] | string;
  rate: number;
  image: string;
  experience: string;
  available: boolean;
  email: string | null;
  pin: string;
  phone: string;
  age: string | null;
  status: NannyStatus;
  invite_token: string | null;
  invite_token_expires: string | null;
  invited_at: string | null;
  registered_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Raw bookings table row */
export interface DbBooking {
  id: number;
  nanny_id: number | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  hotel: string;
  date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  plan: BookingPlan;
  children_count: number;
  children_ages: string;
  notes: string;
  total_price: number;
  status: BookingStatus;
  clock_in: string | null;
  clock_out: string | null;
  locale: string;
  cancelled_at: string | null;
  cancellation_reason: string;
  cancelled_by: string;
  collected_by: string;
  collected_at: string | null;
  collection_note: string;
  payment_method: string;
  created_by: BookingCreator;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/** Booking row from a JOIN with nannies (includes nanny_name, nanny_image) */
export interface DbBookingWithNanny extends DbBooking {
  nanny_name: string;
  nanny_image: string;
}

/** Raw notifications table row */
export interface DbNotification {
  id: number;
  nanny_id: number;
  type: NotificationType;
  title: string;
  message: string;
  booking_id: number | null;
  is_read: boolean;
  created_at: string;
}

/** Raw admin_users table row */
export interface DbAdminUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  is_active: boolean;
  last_login: string | null;
  login_count: number;
  reset_token: string | null;
  reset_token_expires: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Frontend types (camelCase, as used in React state)
// ============================================================

export interface Nanny {
  id: number;
  name: string;
  location: string;
  rating: number;
  bio: string;
  specialties: string[];
  languages: string[];
  rate: number;
  image: string;
  experience: string;
  available: boolean;
  email: string | null;
  pin: string;
  phone: string;
  age: string | null;
  status: NannyStatus;
}

export interface Booking {
  id: number | string;
  nannyId: number | null;
  nannyName: string;
  nannyImage: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hotel: string;
  date: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  plan: BookingPlan;
  childrenCount: number;
  childrenAges: string;
  notes: string;
  totalPrice: number;
  status: BookingStatus;
  createdBy: BookingCreator;
  createdByName: string;
  createdAt: string;
  clockIn: string | null;
  clockOut: string | null;
  cancelledAt: string | null;
  cancellationReason: string;
  cancelledBy: string;
  collectedBy: string;
  collectedAt: string | null;
  collectionNote: string;
  paymentMethod: string;
}

export interface Notification {
  id: number;
  nannyId: number;
  type: NotificationType;
  title: string;
  message: string;
  bookingId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin: string | null;
  loginCount: number;
  createdAt: string;
}

export interface AdminProfile {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  lastLogin: string | null;
  loginCount: number;
}

export interface NannyProfile {
  id: number;
  name: string;
  email: string;
  image: string;
  location: string;
  rating: number;
  experience: string;
  status: NannyStatus;
  bio: string;
  specialties: string[];
  languages: string[];
  rate: number;
  available: boolean;
  phone: string;
  age: string | null;
}

export interface NannyStats {
  totalHoursWorked: number;
  completedBookings: number;
  upcomingBookings: number;
  pendingBookings: number;
  totalEarnings: number;
  thisWeekBookings: number;
}

export interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  todayBookings: number;
}

export interface LoginLog {
  id: number;
  userType: string;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

export interface DbLoginLog {
  id: number;
  user_type: string;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  created_at: string;
}

/** Raw chat_messages table row */
export interface DbChatMessage {
  id: number;
  channel: string;
  sender_type: MessageSenderType;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string;
}

/** Frontend chat message (camelCase) */
export interface ChatMessage {
  id: number;
  channel: string;
  senderType: MessageSenderType;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

/** Channel info for conversation list */
export interface DbChatChannel {
  channel: string;
  last_message: string | null;
  last_sender: string | null;
  last_at: string | null;
  unread_count: string;
}

export interface ChatChannel {
  channel: string;
  lastMessage: string | null;
  lastSender: string | null;
  lastAt: string | null;
  unreadCount: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  unit: string;
  duration: string;
  features: string[];
  highlight: boolean;
}

// ============================================================
// Input types (for creating/updating — omit server-managed fields)
// ============================================================

export type CreateBookingInput = Omit<Booking, 'id' | 'createdAt' | 'clockIn' | 'clockOut'>;
export type CreateNannyInput = Omit<Nanny, 'id'>;

// ============================================================
// API response types (discriminated unions for proper narrowing)
// ============================================================

export type ApiResult<T = void> =
  | ({ success: true } & T)
  | { success: false; error: string };

/** Minimal admin info returned when a nanny has a linked admin account */
export interface LinkedAdminInfo {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  lastLogin: string | null;
  loginCount: number;
}

/** Minimal nanny info returned when an admin has a linked nanny account */
export interface LinkedNannyInfo {
  id: number;
  name: string;
  email: string | null;
  image: string;
  location: string;
  rating: number;
  experience: string;
  bio: string;
  specialties: string[];
  languages: string[];
  rate: number;
  available: boolean;
  status: NannyStatus;
  phone: string;
  age: string | null;
}

export interface NannyLoginResponse { nanny: DbNanny; linkedAdmin?: LinkedAdminInfo }
export interface AdminLoginResponse { admin: DbAdminUser; token?: string; linkedNanny?: LinkedNannyInfo }
export interface InviteResponse { inviteLink: string; emailSent: boolean; nanny: { id: number; name: string; email: string } }
export interface ResendInviteResponse { inviteLink: string; emailSent: boolean }
export interface ProfileUpdateResponse { nanny: DbNanny }

// ============================================================
// Context value type
// ============================================================

export interface DataContextValue {
  nannies: Nanny[];
  addNanny: (nanny: Partial<Nanny>) => Promise<Nanny>;
  updateNanny: (id: number, updates: Partial<Nanny>) => Promise<void>;
  deleteNanny: (id: number) => Promise<void>;
  toggleNannyAvailability: (id: number) => Promise<void>;
  inviteNanny: (data: { name: string; email: string }) => Promise<ApiResult<InviteResponse>>;
  toggleNannyStatus: (id: number) => Promise<void>;
  resendInvite: (nannyId: number) => Promise<ApiResult<ResendInviteResponse>>;

  bookings: Booking[];
  fetchBookings: () => Promise<void>;
  addBooking: (booking: Partial<Booking>, meta?: { locale?: string }) => Promise<Booking>;
  updateBooking: (id: number | string, updates: Partial<Booking>) => Promise<void>;
  updateBookingStatus: (id: number | string, status: BookingStatus, meta?: { reason?: string; cancelledBy?: string }) => Promise<void>;
  clockInBooking: (id: number | string) => Promise<void>;
  clockOutBooking: (id: number | string) => Promise<void>;
  deleteBooking: (id: number | string) => Promise<void>;
  markAsCollected: (id: number | string, data: { collectedBy: string; paymentMethod: string; collectionNote?: string }) => Promise<void>;
  resendInvoice: (id: number | string) => Promise<void>;
  sendBookingReminder: (id: number | string) => Promise<void>;

  stats: DashboardStats;

  isAdmin: boolean;
  isSupervisor: boolean;
  adminProfile: AdminProfile | null;
  adminUsers: AdminUser[];
  adminLogin: (email: string, password: string) => Promise<ApiResult>;
  adminLogout: () => void;
  fetchAdminUsers: () => Promise<AdminUser[]>;
  addAdminUser: (data: { name: string; email: string }) => Promise<ApiResult<{ admin: AdminUser }>>;
  updateAdminUser: (adminId: number, updates: Partial<AdminUser>) => Promise<ApiResult>;
  deleteAdminUser: (adminId: number) => Promise<ApiResult>;
  changeAdminPassword: (adminId: number, currentPassword: string, newPassword: string) => Promise<ApiResult>;
  forgotAdminPassword: (email: string) => Promise<ApiResult<{ message: string; resetLink?: string }>>;
  resetAdminPassword: (resetToken: string, newPassword: string) => Promise<ApiResult<{ message: string }>>;
  registerAdmin: (registerToken: string, newPassword: string) => Promise<ApiResult<{ message: string }>>;

  loading: boolean;

  isNanny: boolean;
  nannyProfile: NannyProfile | null;
  nannyBookings: Booking[];
  nannyNotifications: Notification[];
  nannyStats: NannyStats | null;
  unreadNotifications: number;
  nannyLogin: (email: string, pin: string) => Promise<ApiResult>;
  nannyLogout: () => void;
  fetchNannyBookings: () => Promise<void>;
  fetchNannyStats: () => Promise<void>;
  fetchNannyNotifications: () => Promise<void>;
  markNotificationsRead: (notificationIds: number[]) => Promise<void>;
  updateNannyProfile: (updates: Partial<NannyProfile>) => Promise<ApiResult>;

  // Messaging
  chatChannels: ChatChannel[];
  chatMessages: Record<string, ChatMessage[]>;
  activeChannel: string | null;
  unreadChatCount: number;
  fetchChatChannels: () => Promise<void>;
  fetchChatMessages: (channel: string) => Promise<void>;
  sendChatMessage: (channel: string, content: string) => Promise<void>;
  markChatRead: (channel: string) => Promise<void>;
  setActiveChannel: (channel: string | null) => void;
}
