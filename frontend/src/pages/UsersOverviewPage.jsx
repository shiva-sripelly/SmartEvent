import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

export default function UsersOverviewPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      const response = await API.get("/admin/users");
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load users.");
    }
  };

  useEffect(() => {
    if (!loading && user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [loading, user]);

  if (loading || !user) {
    return <h2 className="loading">Loading users...</h2>;
  }

  return (
    <div className="page-container">
      <div className="admin-header admin-header-compact">
        <div>
          <h2>Users Overview</h2>
          <p className="admin-greeting">Manage registered users and account roles.</p>
        </div>
        <div className="admin-action-group">
          <Link className="admin-nav-link" to="/admin">
            Dashboard
          </Link>
          <Link className="admin-nav-link" to="/admin/analytics">
            Analytics
          </Link>
          <Link className="admin-nav-link" to="/admin/events">
            Events
          </Link>
          <Link className="admin-nav-link" to="/admin/bookings">
            Bookings
          </Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="overview-card">
        <h3>Registered Users</h3>
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
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
                  <td colSpan="4">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
