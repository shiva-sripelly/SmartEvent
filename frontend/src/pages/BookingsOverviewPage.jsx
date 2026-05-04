import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

export default function BookingsOverviewPage() {
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    try {
      const response = await API.get("/admin/all-bookings");
      setBookings(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load bookings.");
    }
  };

  useEffect(() => {
    if (!loading && user?.role === "ADMIN") {
      fetchBookings();
    }
  }, [loading, user]);

  if (loading || !user) {
    return <h2 className="loading">Loading bookings...</h2>;
  }

  return (
    <div className="page-container">
      <div className="admin-header admin-header-compact">
        <div>
          <h2>Booking Overview</h2>
          <p className="admin-greeting">Review booking activity across the platform.</p>
        </div>
        <div className="admin-action-group">
          <Link className="admin-nav-link" to="/admin">
            Dashboard
          </Link>
          <Link className="admin-nav-link" to="/admin/analytics">
            Analytics
          </Link>
          <Link className="admin-nav-link" to="/admin/users">
            Users
          </Link>
          <Link className="admin-nav-link" to="/admin/events">
            Events
          </Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="overview-card">
        <h3>All Bookings</h3>
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Event ID</th>
                <th>Tickets</th>
                <th>Revenue</th>
                <th>Status</th>
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
                  <td colSpan="6">No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
