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

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div>
      <h2>Notifications</h2>

      {notifications.map((n) => (
        <div className="card" key={n.id}>
          <h4>{n.title}</h4>
          <p>{n.message}</p>

          <p>Status: {n.is_read ? "Read" : "Unread"}</p>

          {!n.is_read && (
            <button onClick={() => markAsRead(n.id)}>
              Mark as Read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}