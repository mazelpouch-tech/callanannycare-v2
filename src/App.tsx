import { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Nannies from './pages/Nannies'
import HowItWorks from './pages/HowItWorks'
import Book from './pages/Book'
import ParentForm from './pages/ParentForm'
import ExtendBooking from './pages/ExtendBooking'
import RebookBooking from './pages/RebookBooking'
import BookingStatus from './pages/BookingStatus'
import ReviewNannyPublic from './pages/ReviewNannyPublic'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsConditions from './pages/TermsConditions'
import PartnerDemo from './pages/PartnerDemo'
import NotFound from './pages/NotFound'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import AdminBookings from './pages/admin/AdminBookings'
import AdminNannies from './pages/admin/AdminNannies'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCalendar from './pages/admin/AdminCalendar'
import AdminQRCode from './pages/admin/AdminQRCode'
import AdminInvoices from './pages/admin/AdminInvoices'
import AdminLoginLogs from './pages/admin/AdminLoginLogs'
import AdminMessages from './pages/admin/AdminMessages'
import AdminRevenue from './pages/admin/AdminRevenue'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminParents from './pages/admin/AdminParents'
import AdminQuotes from './pages/admin/AdminQuotes'
import SupervisorLayout from './pages/supervisor/SupervisorLayout'
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard'
import SupervisorBookings from './pages/supervisor/SupervisorBookings'
import SupervisorRevenue from './pages/supervisor/SupervisorRevenue'
import SupervisorAssignments from './pages/supervisor/SupervisorAssignments'
import SupervisorParents from './pages/supervisor/SupervisorParents'
import NannyLogin from './pages/nanny/NannyLogin'
import NannyRegister from './pages/nanny/NannyRegister'
import NannyLayout from './pages/nanny/NannyLayout'
import NannyDashboard from './pages/nanny/NannyDashboard'
import NannyCalendar from './pages/nanny/NannyCalendar'
import NannyBookings from './pages/nanny/NannyBookings'
import NannyNotifications from './pages/nanny/NannyNotifications'
import NannyMessages from './pages/nanny/NannyMessages'
import NannyProfile from './pages/nanny/NannyProfile'

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Listen for notification click URLs from the service worker (iOS PWA fix)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
        const targetUrl = event.data.url as string;
        // Only navigate if we're not already on that URL
        if (location.pathname + location.search !== targetUrl) {
          navigate(targetUrl);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // On app startup, ask the SW if there's a pending notification URL
    // (for when iOS opens the PWA to start_url instead of the notification URL)
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'GET_NOTIFICATION_URL' });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Routes>
      {/* Public routes with Navbar + Footer */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/nannies" element={<Nannies />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/book" element={<Book />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Partner demo page */}
      <Route path="/partner" element={<PartnerDemo />} />

      {/* Public standalone pages (no navbar/footer) */}
      <Route path="/parent-form" element={<ParentForm />} />
      <Route path="/extend/:id" element={<ExtendBooking />} />
      <Route path="/rebook/:id" element={<RebookBooking />} />
      <Route path="/booking/:id" element={<BookingStatus />} />
      <Route path="/review/nanny/:id" element={<ReviewNannyPublic />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsConditions />} />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="revenue" element={<AdminRevenue />} />
        <Route path="invoices" element={<AdminInvoices />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="nannies" element={<AdminNannies />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="qr-codes" element={<AdminQRCode />} />
        <Route path="login-logs" element={<AdminLoginLogs />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="parents" element={<AdminParents />} />
        <Route path="quotes" element={<AdminQuotes />} />
      </Route>

      {/* Supervisor routes */}
      <Route path="/supervisor" element={<SupervisorLayout />}>
        <Route index element={<SupervisorDashboard />} />
        <Route path="bookings" element={<SupervisorBookings />} />
        <Route path="assignments" element={<SupervisorAssignments />} />
        <Route path="revenue" element={<SupervisorRevenue />} />
        <Route path="parents" element={<SupervisorParents />} />
      </Route>

      {/* Nanny portal routes */}
      <Route path="/nanny/login" element={<NannyLogin />} />
      <Route path="/nanny/register" element={<NannyRegister />} />
      <Route path="/nanny" element={<NannyLayout />}>
        <Route index element={<NannyDashboard />} />
        <Route path="calendar" element={<NannyCalendar />} />
        <Route path="bookings" element={<NannyBookings />} />
        <Route path="notifications" element={<NannyNotifications />} />
        <Route path="messages" element={<NannyMessages />} />
        <Route path="profile" element={<NannyProfile />} />
        <Route path="parents" element={<SupervisorParents />} />
      </Route>
    </Routes>
  )
}
