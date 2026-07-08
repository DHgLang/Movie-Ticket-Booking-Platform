import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { recordRumPageView } from "./lib/rum";
import Layout from "./components/Layout";
import HomePage from "./pages/Home";
import GoldClassPage from "./pages/GoldClass";
import MoviesPage from "./pages/Movies";
import CinemasPage from "./pages/Cinemas";
import BuyTicketsPage from "./pages/BuyTickets";
import DiningPage from "./pages/Dining";
import ShopPage from "./pages/Shop";
import PromotionsPage from "./pages/Promotions";
import VouchersPage from "./pages/Vouchers";
import GroupBookingsPage from "./pages/GroupBookings";
import ShowtimesPage from "./pages/Showtimes";
import SeatsPage from "./pages/Seats";
import TicketPage from "./pages/Ticket";
import PaymentResultPage from "./pages/PaymentResult";
import PaymentMockPage from "./pages/PaymentMock";
import LoginPage from "./pages/Login";
import AccountPage from "./pages/Account";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTraffic from "./pages/admin/Traffic";
import AdminMovies from "./pages/admin/Movies";
import AdminShowtimes from "./pages/admin/Showtimes";
import AdminBookings from "./pages/admin/Bookings";
import AdminCinemas from "./pages/admin/Cinemas";
import AdminSettingsPage from "./pages/admin/Settings";
import "./index.css";

function RumPageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    recordRumPageView(location.pathname).catch(() => undefined);
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RumPageViewTracker />
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="traffic" element={<AdminTraffic />} />
          <Route path="movies" element={<AdminMovies />} />
          <Route path="showtimes" element={<AdminShowtimes />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="cinemas" element={<AdminCinemas />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="gold-class" element={<GoldClassPage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="cinemas" element={<CinemasPage />} />
          <Route path="buy-tickets" element={<BuyTicketsPage />} />
          <Route path="dining" element={<DiningPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="group-bookings" element={<GroupBookingsPage />} />
          <Route path="showtimes/:movieId" element={<ShowtimesPage />} />
          <Route path="seats/:showtimeId" element={<SeatsPage />} />
          <Route path="ticket/:bookingId" element={<TicketPage />} />
          <Route path="payment/result" element={<PaymentResultPage />} />
          <Route path="payment/mock" element={<PaymentMockPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
