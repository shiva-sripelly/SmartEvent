import { useEffect, useState } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    event_date: "",
    ticket_price: "",
    banner_image: null,
  });
  const [fileKey, setFileKey] = useState(Date.now());
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [existingBannerUrl, setExistingBannerUrl] = useState(null);

  const handleAdminLogout = () => {
    logout();
    navigate("/admin-login");
  };

  const fetchEvents = async () => {
    const res = await API.get("/admin/events");
    setEvents(res.data);
  };

  const fetchStats = async () => {
    const res = await API.get("/admin/stats");
    setStats(res.data);
  };

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    setForm({ ...form, banner_image: file });
    setImagePreview(file ? URL.createObjectURL(file) : existingBannerUrl);
  };

  const handleEditEvent = (event) => {
    setSelectedEventId(event.id);
    setForm({
      title: event.title || "",
      description: event.description || "",
      category: event.category || "",
      location: event.location || "",
      event_date: new Date(event.event_date).toISOString().slice(0, 16),
      ticket_price: event.ticket_price?.toString() || "",
      banner_image: null,
    });
    setExistingBannerUrl(event.banner_image || null);
    setImagePreview(event.banner_image || null);
  };

  const handleCancelEdit = () => {
    setSelectedEventId(null);
    setExistingBannerUrl(null);
    setImagePreview(null);
    setForm({
      title: "",
      description: "",
      category: "",
      location: "",
      event_date: "",
      ticket_price: "",
      banner_image: null,
    });
    setFileKey(Date.now());
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();

    const isAddMode = !selectedEventId;
    const isFormInvalid = Object.entries(form).some(([key, value]) => {
      if (key === "banner_image") {
        return isAddMode && !value;
      }
      return value === null || value === "";
    });

    if (isFormInvalid) {
      alert("Please fill in all event fields, including the event image.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("location", form.location);
      formData.append("event_date", form.event_date);
      formData.append("ticket_price", form.ticket_price);
      if (form.banner_image) {
        formData.append("banner_image", form.banner_image);
      }

      if (selectedEventId) {
        await API.put(`/admin/events/${selectedEventId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Event updated");
      } else {
        await API.post("/admin/events", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Event added");
      }

      handleCancelEdit();
      fetchEvents();
      fetchStats();
    } catch {
      alert("Failed to add event");
    }
  };

  const handleCancel = async (id) => {
    try {
      await API.put(`/admin/events/${id}/cancel`);
      alert("Event cancelled & users notified");
      fetchEvents();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || "Cancel failed");
    }
  };

  return (
    <div className="page-container">
      <div className="admin-header">
        <div>
          <h2>Admin Panel</h2>
          <p className="admin-greeting">Hi {user?.username || "Admin"}</p>
        </div>

        <button className="admin-logout-btn" onClick={handleAdminLogout}>
          Logout
        </button>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Events</h3>
            <p>{stats.total_events}</p>
          </div>

          <div className="stat-card">
            <h3>Active Events</h3>
            <p>{stats.active_events}</p>
          </div>

          <div className="stat-card">
            <h3>Cancelled Events</h3>
            <p>{stats.cancelled_events}</p>
          </div>

          <div className="stat-card">
            <h3>Total Bookings</h3>
            <p>{stats.total_bookings}</p>
          </div>

          <div className="stat-card">
            <h3>Total Revenue</h3>
            <p>₹{stats.total_revenue}</p>
          </div>
        </div>
      )}

      <form className="card admin-form" onSubmit={handleAddEvent}>
        <h3>Add Event</h3>

        <div className="admin-form-grid">
          <input
            name="title"
            placeholder="Title"
            onChange={handleChange}
            value={form.title}
            required
          />

          <input
            name="description"
            placeholder="Description"
            onChange={handleChange}
            value={form.description}
            required
          />

          <select
            name="category"
            onChange={handleChange}
            value={form.category}
            required
          >
            <option value="" disabled>
              Select Category
            </option>
            <option value="comedy">Comedy</option>
            <option value="music">Music</option>
            <option value="tech">Tech</option>
            <option value="business">Business</option>
            <option value="sports">Sports</option>
            <option value="workshop">Workshop</option>
          </select>

          <input
            name="location"
            placeholder="Location"
            onChange={handleChange}
            value={form.location}
            required
          />

          <input
            type="datetime-local"
            name="event_date"
            onChange={handleChange}
            value={form.event_date}
            required
          />

          <input
            name="ticket_price"
            placeholder="Price"
            onChange={handleChange}
            value={form.ticket_price}
            required
          />

          <input
            key={fileKey}
            type="file"
            name="banner_image"
            accept="image/*"
            onChange={handleFileChange}
            required={!selectedEventId}
          />

          {imagePreview && (
            <div className="image-preview-card">
              <p>Selected image preview:</p>
              <img src={imagePreview} alt="Selected event banner preview" />
            </div>
          )}

          <div className="admin-form-actions">
            <button className="admin-add-btn" type="submit">
              {selectedEventId ? "Update Event" : "Add Event"}
            </button>
            {selectedEventId && (
              <button
                type="button"
                className="admin-cancel-btn"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      </form>

      <h3 className="admin-section-title">All Events</h3>

      <div className="admin-events-grid">
        {events.map((e) => (
          <div className="card admin-event-card" key={e.id}>
            {e.banner_image && (
              <div className="admin-event-thumb">
                <img src={e.banner_image} alt={`${e.title} thumbnail`} />
              </div>
            )}

            <h4>{e.title}</h4>
            <p>{e.location}</p>
            <p>₹{e.ticket_price}</p>

            <p>
              Status:{" "}
              <strong
                style={{
                  color:
                    e.status === "CANCELLED" ||
                    e.status === "INACTIVE" ||
                    e.status === "EXPIRED"
                      ? "red"
                      : "green",
                }}
              >
                {e.status || "ACTIVE"}
              </strong>
            </p>

            {e.created_by === user.id && (
              <div className="admin-actions">
                {e.status !== "CANCELLED" &&
                  e.status !== "INACTIVE" &&
                  e.status !== "EXPIRED" && (
                    <button
                      className="admin-edit-btn"
                      onClick={() => handleEditEvent(e)}
                    >
                      Edit
                    </button>
                  )}
                {e.status !== "CANCELLED" &&
                  e.status !== "INACTIVE" &&
                  e.status !== "EXPIRED" && (
                    <button
                      className="admin-cancel-btn"
                      onClick={() => handleCancel(e.id)}
                    >
                      Cancel Event
                    </button>
                  )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}