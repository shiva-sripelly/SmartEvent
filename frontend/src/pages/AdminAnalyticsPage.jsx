import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";

function formatCurrency(value) {
  return value != null ? `?${Number(value).toLocaleString()}` : "?0";
}

export default function AdminAnalyticsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      const response = await API.get("/admin/stats");
      setStats(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || t("analyticsLoadFailed"));
    }
  };

  useEffect(() => {
    if (!loading && user?.role === "ADMIN") {
      fetchStats();
    }
  }, [loading, user]);

  if (loading || !user) {
    return <h2 className="loading">{t("loadingAnalytics")}</h2>;
  }

  const daily = stats?.daily_sales || [];
  const maxSales = Math.max(...(daily.map((item) => item.tickets_sold) || [1]), 1);
  const bestDay = daily.reduce(
    (best, item) => (item.tickets_sold > best.tickets_sold ? item : best),
    { date: "-", tickets_sold: 0 }
  );

  return (
    <div className="page-container">
      <div className="admin-header admin-header-compact">
        <div>
          <h2>{t("platformAnalytics")}</h2>
          <p className="admin-greeting">{t("analyticsSubtitle")}</p>
        </div>
        <div className="admin-action-group">
          <Link className="admin-nav-link" to="/admin">{t("dashboard")}</Link>
          <Link className="admin-nav-link" to="/admin/users">{t("users")}</Link>
          <Link className="admin-nav-link" to="/admin/events">{t("events")}</Link>
          <Link className="admin-nav-link" to="/admin/bookings">{t("bookings")}</Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card"><h3>{t("users")}</h3><p>{stats.total_users}</p></div>
            <div className="stat-card"><h3>{t("totalEvents")}</h3><p>{stats.total_events}</p></div>
            <div className="stat-card"><h3>{t("activeEvents")}</h3><p>{stats.active_events}</p></div>
            <div className="stat-card"><h3>{t("totalBookings")}</h3><p>{stats.total_bookings}</p></div>
            <div className="stat-card"><h3>{t("totalTicketsSold")}</h3><p>{stats.total_tickets_sold}</p></div>
            <div className="stat-card"><h3>{t("totalRevenue")}</h3><p>{formatCurrency(stats.total_revenue)}</p></div>
          </div>

          <div className="analytics-grid">
            <div className="chart-card">
              <h3>{t("dailyTicketSales")}</h3>
              <div className="chart-grid">
                {stats.daily_sales.map((item) => (
                  <div className="chart-bar" key={item.date}>
                    <div className="chart-fill" style={{ height: `${(item.tickets_sold / maxSales) * 100}%` }}>
                      <span>{item.tickets_sold}</span>
                    </div>
                    <span className="chart-label">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h3>{t("topRevenueEvents")}</h3>
              <div className="bar-list">
                {stats.top_revenue_events.map((event) => (
                  <div className="bar-list-item" key={event.event_id}>
                    <div>
                      <strong>{event.title}</strong>
                      <p>{formatCurrency(event.revenue)}</p>
                    </div>
                    <div className="progress-track small">
                      <div className="progress-fill small" style={{ width: `${Math.min((event.revenue / (stats.total_revenue || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="chart-card">
              <h3>{t("popularEvents")}</h3>
              <ul className="insight-list">
                {stats.popular_events.map((event) => (
                  <li key={event.event_id}>
                    <span>{event.title}</span>
                    <strong>{event.tickets_sold} {t("tickets")}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="chart-card">
              <h3>{t("monthlyBookingTrends")}</h3>
              <p className="small-text">{t("bookingTrendCopy")}</p>
              <div className="insight-list">
                <li><span>{t("last7DaysAverage")}</span><strong>{Math.round(stats.total_bookings / 7) || 0}</strong></li>
                <li><span>{t("bestPerformingDay")}</span><strong>{bestDay.date}</strong></li>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="loading">{t("loadingAnalytics")}</p>
      )}
    </div>
  );
}
