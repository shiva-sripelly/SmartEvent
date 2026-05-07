import { useEffect, useState } from "react";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    const res = await API.get("/notifications/");
    setNotifications(res.data);
  };

  const markAsRead = async (id) => {
    await API.put(`/notifications/${id}/read`);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await API.put("/notifications/read-all");
    fetchNotifications();
  };

  useEffect(() => {
    let isMounted = true;

    API.get("/notifications/").then((res) => {
      if (isMounted) setNotifications(res.data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2>{t("navNotifications")}</h2>
          <p className="subtle-text">{t("notificationsSubtitle")}</p>
        </div>
        <button className="download-btn" onClick={markAllAsRead}>{t("markAllRead")}</button>
      </div>

      {notifications.length === 0 ? (
        <div className="card empty-state">{t("navNoNotifications")}</div>
      ) : (
        notifications.map((n) => (
          <div className={`card notification-card ${n.is_read ? "read" : "unread"}`} key={n.id}>
            <div className="booking-card-header">
              <div>
                <span className="category">{n.notification_type || n.type}</span>
                <h4>{n.title}</h4>
              </div>
              <span className={`status-pill ${n.is_read ? "confirmed" : "pending"}`}>
                {n.is_read ? t("read") : t("unread")}
              </span>
            </div>
            <p>{n.message}</p>

            {!n.is_read && (
              <button className="ghost-btn" onClick={() => markAsRead(n.id)}>
                {t("markAsRead")}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
