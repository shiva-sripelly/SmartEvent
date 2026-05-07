import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";
import API from "../api/axios";

export default function UsersOverviewPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      const response = await API.get("/admin/users");
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || t("usersLoadFailed"));
    }
  };

  useEffect(() => {
    if (!loading && user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [loading, user]);

  if (loading || !user) {
    return <h2 className="loading">{t("loadingUsers")}</h2>;
  }

  return (
    <div className="page-container">
      <div className="admin-header admin-header-compact">
        <div>
          <h2>{t("usersOverview")}</h2>
          <p className="admin-greeting">{t("usersOverviewSubtitle")}</p>
        </div>
        <div className="admin-action-group">
          <Link className="admin-nav-link" to="/admin">
            {t("dashboard")}
          </Link>
          <Link className="admin-nav-link" to="/admin/analytics">
            {t("platformAnalytics")}
          </Link>
          <Link className="admin-nav-link" to="/admin/events">
            {t("events")}
          </Link>
          <Link className="admin-nav-link" to="/admin/bookings">
            {t("bookings")}
          </Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="overview-card">
        <h3>{t("registeredUsers")}</h3>
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th>{t("id")}</th>
                <th>{t("username")}</th>
                <th>{t("email")}</th>
                <th>{t("role")}</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((userItem) => (
                  <tr key={userItem.id}>
                    <td>{userItem.id}</td>
                    <td>{userItem.username}</td>
                    <td>{userItem.email}</td>
                    <td>{userItem.role}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">{t("noUsersFound")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



