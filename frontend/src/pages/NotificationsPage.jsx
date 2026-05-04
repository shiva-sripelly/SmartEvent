import { useEffect, useState } from "react";
import API from "../api/axios";

export default function NotificationsPage() {
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
          <h2>Notifications</h2>
          <p className="subtle-text">Booking, payment, event, and system updates in one place.</p>
        </div>
        <button className="download-btn" onClick={markAllAsRead}>Mark all as read</button>
      </div>

      {notifications.length === 0 ? (
        <div className="card empty-state">No notifications yet</div>
      ) : (
        notifications.map((n) => (
          <div className={`card notification-card ${n.is_read ? "read" : "unread"}`} key={n.id}>
            <div className="booking-card-header">
              <div>
                <span className="category">{n.notification_type || n.type}</span>
                <h4>{n.title}</h4>
              </div>
              <span className={`status-pill ${n.is_read ? "confirmed" : "pending"}`}>
                {n.is_read ? "Read" : "Unread"}
              </span>
            </div>
            <p>{n.message}</p>

            {!n.is_read && (
              <button className="ghost-btn" onClick={() => markAsRead(n.id)}>
                Mark as Read
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
