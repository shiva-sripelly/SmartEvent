import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { getDisplayEventStatus } from "../utils/eventStatus";

export default function EventsOverviewPage() {
  const { user, loading } = useAuth();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    try {
      const response = await API.get("/admin/all-events");
      setEvents(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load events.");
    }
  };

  useEffect(() => {
    if (!loading && user?.role === "ADMIN") {
      fetchEvents();
    }
  }, [loading, user]);

  if (loading || !user) {
    return <h2 className="loading">Loading events...</h2>;
  }

  return (
    <div className="page-container">
      <div className="admin-header admin-header-compact">
        <div>
          <h2>Events Overview</h2>
          <p className="admin-greeting">Browse platform events and lifecycle status.</p>
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
          <Link className="admin-nav-link" to="/admin/bookings">
            Bookings
          </Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="overview-card">
        <h3>All Events</h3>
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Organizer ID</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {events.length > 0 ? (
                events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.id}</td>
                    <td>{event.title}</td>
                    <td>{event.category}</td>
                    <td>{getDisplayEventStatus(event)}</td>
                    <td>{event.created_by || event.organizer_id}</td>
                    <td>₹{event.ticket_price}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
