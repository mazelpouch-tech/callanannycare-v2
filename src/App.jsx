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
    </Routes>
  )
}
