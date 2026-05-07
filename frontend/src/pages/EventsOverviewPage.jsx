import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";
import API from "../api/axios";
import { getDisplayEventStatus } from "../utils/eventStatus";

export default function EventsOverviewPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    try {
      const response = await API.get("/admin/all-events");
      setEvents(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || t("eventsLoadFailed"));
    }
  };

  useEffect(() => {
    if (!loading && user?.role === "ADMIN") {
      fetchEvents();
    }
  }, [loading, user]);

  if (loading || !user) {
    return <h2 className="loading">{t("loadingEvents")}</h2>;
  }

  return (
    <div className="page-container">
      <div className="admin-header admin-header-compact">
        <div>
          <h2>{t("eventsOverview")}</h2>
          <p className="admin-greeting">{t("eventsOverviewSubtitle")}</p>
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
          <Link className="admin-nav-link" to="/admin/bookings">
            {t("bookings")}
          </Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="overview-card">
        <h3>{t("allEvents")}</h3>
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th>{t("id")}</th>
                <th>{t("title")}</th>
                <th>{t("category")}</th>
                <th>{t("status")}</th>
                <th>{t("organizerId")}</th>
                <th>{t("price")}</th>
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
                  <td colSpan="6">{t("noEventsFound")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



