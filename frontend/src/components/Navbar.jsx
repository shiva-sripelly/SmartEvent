import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";
import useTheme from "../context/useTheme";
import API from "../api/axios";
import { getSafeImageUrl } from "../utils/imageUrl";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isLightMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const profileImage = getSafeImageUrl(user?.profile_picture);

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

  const getNavLinkClass = ({ isActive }) => (isActive ? "nav-link-active" : undefined);

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
        <NavLink to="/" end className={getNavLinkClass}>{t("navHome")}</NavLink>
        <NavLink to="/wishlist" className={getNavLinkClass}>{t("navWishlist")}</NavLink>
        <NavLink to="/bookings" className={getNavLinkClass}>{t("navBookings")}</NavLink>
        <NavLink to="/tickets" className={getNavLinkClass}>{t("navTickets")}</NavLink>
        <NavLink to="/referrals" className={getNavLinkClass}>{t("navReferrals")}</NavLink>
        {user ? (
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `nav-profile-avatar${isActive ? " nav-link-active" : ""}`
            }
            aria-label={`${user.username} ${t("navProfile")}`}
            title={`${user.username} ${t("navProfile")}`}
          >
            {profileImage ? (
              <img src={profileImage} alt={`${user.username} profile`} />
            ) : (
              <span className="default-profile-icon" aria-hidden="true"></span>
            )}
          </NavLink>
        ) : (
          <NavLink to="/profile" className={getNavLinkClass}>{t("navProfile")}</NavLink>
        )}

        <label className="language-switcher">
          <span>{t("languageLabel")}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label={t("languageLabel")}
          >
            <option value="en">{t("languageEnglish")}</option>
            <option value="hi">{t("languageHindi")}</option>
          </select>
        </label>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={isLightMode ? t("switchToDarkMode") : t("switchToLightMode")}
          title={isLightMode ? t("switchToDarkMode") : t("switchToLightMode")}
        >
          <span aria-hidden="true">{isLightMode ? "☀" : "☾"}</span>
          {isLightMode ? t("lightMode") : t("darkMode")}
        </button>

        <div className="notification-menu" ref={notificationRef}>
          <button
            className={`notification-link notification-button${
              location.pathname === "/notifications" ? " nav-link-active" : ""
            }`}
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
                  <strong>{t("navNotifications")}</strong>
                  <span>
                    {unreadCount} {t("navUnread")}
                  </span>
                </div>
                <button type="button" onClick={handleCloseNotifications}>
                  {t("navClose")}
                </button>
              </div>

              {notifications.length === 0 ? (
                <p>{t("navNoNotifications")}</p>
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
                {t("navViewAllNotifications")}
              </Link>
            </div>
          )}
        </div>

        {user && user.role === "ADMIN" && (
          <NavLink to="/admin" className={getNavLinkClass}>{t("navAdminPanel")}</NavLink>
        )}

        {user && user.role === "ORGANIZER" && (
          <NavLink to="/organizer" className={getNavLinkClass}>{t("navOrganizerDashboard")}</NavLink>
        )}

        {user && (
          <>
            <NavLink
              className={({ isActive }) => `user-name${isActive ? " nav-link-active" : ""}`}
              to="/profile"
            >
              {t("navGreeting")}, {user.username}
            </NavLink>

            <button
              onClick={handleLogout}
              className="ml-2 px-4 py-1.5 rounded-full border border-red-400/40 text-red-400 hover:bg-red-500/10 transition"
            >
              {t("navLogout")}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

