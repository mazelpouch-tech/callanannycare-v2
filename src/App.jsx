import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Nannies from './pages/Nannies'
import HowItWorks from './pages/HowItWorks'
import Book from './pages/Book'
import NotFound from './pages/NotFound'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import AdminBookings from './pages/admin/AdminBookings'
import AdminNannies from './pages/admin/AdminNannies'
import NannyLogin from './pages/nanny/NannyLogin'
import NannyRegister from './pages/nanny/NannyRegister'
import NannyLayout from './pages/nanny/NannyLayout'
import NannyDashboard from './pages/nanny/NannyDashboard'
import NannyCalendar from './pages/nanny/NannyCalendar'
import NannyBookings from './pages/nanny/NannyBookings'
import NannyNotifications from './pages/nanny/NannyNotifications'
import NannyProfile from './pages/nanny/NannyProfile'

export default function App() {
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

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="nannies" element={<AdminNannies />} />
      </Route>

      {/* Nanny portal routes */}
      <Route path="/nanny/login" element={<NannyLogin />} />
      <Route path="/nanny/register" element={<NannyRegister />} />
      <Route path="/nanny" element={<NannyLayout />}>
        <Route index element={<NannyDashboard />} />
        <Route path="calendar" element={<NannyCalendar />} />
        <Route path="bookings" element={<NannyBookings />} />
        <Route path="notifications" element={<NannyNotifications />} />
        <Route path="profile" element={<NannyProfile />} />
      </Route>
    </Routes>
  )
}
