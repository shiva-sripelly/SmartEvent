import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LanguageProvider from "./context/LanguageProvider";
import ThemeProvider from "./context/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import ChatbotWidget from "./components/ChatbotWidget";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import EventDetailsPage from "./pages/EventDetailsPage";
import BookingHistoryPage from "./pages/BookingHistoryPage";
import TicketsPage from "./pages/TicketsPage";
import NotificationsPage from "./pages/NotificationsPage";
import PaymentCheckoutPage from "./pages/PaymentCheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import WishlistPage from "./pages/WishlistPage";
import ProfilePage from "./pages/ProfilePage";
import ReferralPage from "./pages/ReferralPage";
import AdminPage from "./pages/AdminPage";
import OrganizerPage from "./pages/OrganizerPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import UsersOverviewPage from "./pages/UsersOverviewPage";
import EventsOverviewPage from "./pages/EventsOverviewPage";
import BookingsOverviewPage from "./pages/BookingsOverviewPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import "./App.css";

function PageTransition({ children }) {
  const location = useLocation();

  return (
    <main className="full-page page-transition" key={location.pathname}>
      {children}
    </main>
  );
}

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <PageTransition>{children}</PageTransition>
      <ChatbotWidget />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <HomePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <EventDetailsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <BookingHistoryPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TicketsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <WishlistPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ProfilePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/referrals"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ReferralPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <NotificationsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout/:bookingId"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PaymentCheckoutPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment-success"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PaymentSuccessPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer"
            element={
              <ProtectedRoute allowedRoles={["ORGANIZER"]}>
                <OrganizerPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <UsersOverviewPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/events"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <EventsOverviewPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <BookingsOverviewPage />
              </ProtectedRoute>
            }
          />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
