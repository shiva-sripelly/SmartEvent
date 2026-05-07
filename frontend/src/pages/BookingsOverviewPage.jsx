import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";
import API from "../api/axios";

export default function BookingsOverviewPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    try {
      const response = await API.get("/admin/all-bookings");
      setBookings(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || t("bookingsLoadFailed"));
    }
  };

  useEffect(() => {
    if (!loading && user?.role === "ADMIN") {
      fetchBookings();
    }
  }, [loading, user]);

  if (loading || !user) {
    return <h2 className="loading">{t("loadingBookings")}</h2>;
  }

  return (
    <div className="page-container">
      <div className="admin-header admin-header-compact">
        <div>
          <h2>{t("bookingOverview")}</h2>
          <p className="admin-greeting">{t("bookingOverviewSubtitle")}</p>
        </div>
        <div className="admin-action-group">
          <Link className="admin-nav-link" to="/admin">
            {t("dashboard")}
          </Link>
          <Link className="admin-nav-link" to="/admin/analytics">
            {t("platformAnalytics")}
          </Link>
          <Link className="admin-nav-link" to="/admin/users">
            {t("users")}
          </Link>
          <Link className="admin-nav-link" to="/admin/events">
            {t("events")}
          </Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="overview-card">
        <h3>{t("allBookings")}</h3>
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th>{t("id")}</th>
                <th>{t("userId")}</th>
                <th>{t("eventId")}</th>
                <th>{t("tickets")}</th>
                <th>{t("revenue")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>{booking.user_id}</td>
                    <td>{booking.event_id}</td>
                    <td>{booking.ticket_quantity}</td>
                    <td>₹{booking.total_price}</td>
                    <td>{booking.booking_status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">{t("noBookingsFound")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



