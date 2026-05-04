import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  const fetchNotifications = async () => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    try {
      const res = await API.get("/notifications/");
      setNotifications(res.data.slice(0, 5));
      setUnreadCount(res.data.filter((item) => !item.is_read).length);
    } catch {
      setUnreadCount(0);
      setNotifications([]);
    }
  };

  const handleToggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);

    if (nextState) {
      await fetchNotifications();
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <nav className="navbar backdrop-blur-xl bg-black/70 border-b border-yellow-500/20 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-bold text-black shadow-md">
        </div>

        <h2 className="text-lg font-bold tracking-wide">SmartEvent</h2>
      </div>

      <div className="nav-links flex items-center gap-2">
        <Link to="/">Home</Link>
        <Link to="/bookings">Bookings</Link>
        <Link to="/tickets">Tickets</Link>

        <div className="notification-menu" ref={notificationRef}>
          <button
            className="notification-link notification-button"
            type="button"
            onClick={handleToggleNotifications}
            aria-haspopup="menu"
            aria-expanded={showNotifications}
          >
            <span className="nav-bell">🔔</span>

            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown" role="menu">
              <div className="notification-dropdown-header">
                <div>
                  <strong>Notifications</strong>
                  <span>{unreadCount} unread</span>
                </div>
                <button type="button" onClick={handleCloseNotifications}>
                  Close
                </button>
              </div>

              {notifications.length === 0 ? (
                <p>No notifications yet</p>
              ) : (
                notifications.map((item) => (
                  <Link
                    to="/notifications"
                    key={item.id}
                    onClick={handleCloseNotifications}
                    role="menuitem"
                  >
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                  </Link>
                ))
              )}

              <Link
                to="/notifications"
                className="view-all-link"
                onClick={handleCloseNotifications}
                role="menuitem"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        {user && user.role === "ADMIN" && <Link to="/admin">Admin Panel</Link>}

        {user && user.role === "ORGANIZER" && (
          <Link to="/organizer">Organizer Dashboard</Link>
        )}

        {user && (
          <>
            <span className="user-name">Hi, {user.username}</span>

            <button
              onClick={handleLogout}
              className="ml-2 px-4 py-1.5 rounded-full border border-red-400/40 text-red-400 hover:bg-red-500/10 transition"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
