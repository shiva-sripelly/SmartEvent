import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      try {
        const res = await API.get("/notifications/");
        const unread = res.data.filter((item) => !item.is_read).length;
        setUnreadCount(unread);
      } catch (error) {
        setUnreadCount(0);
      }
    };

    fetchUnreadNotifications();
  }, [user]);

  return (
    <nav className="navbar">
      <h2>SmartEvent</h2>

      <div className="nav-links">
        <Link to="/">Home</Link>
    
        <Link to="/bookings">Bookings</Link>
        <Link to="/tickets">Tickets</Link>
        <Link to="/notifications" className="notification-link">
          <span className="nav-bell" aria-label="notifications">
            🔔
          </span>
          Notifications
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </Link>

        {user && user.role === "ADMIN" && (
          <Link to="/admin">Admin Panel</Link>
        )}

        {user && user.role === "ORGANIZER" && (
          <Link to="/organizer">Organizer Dashboard</Link>
        )}

        {user && (
          <>
            <span className="user-name">Hi, {user.username}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}