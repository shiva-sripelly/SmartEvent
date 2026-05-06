import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getDisplayEventStatus, isEventUnavailable } from "../utils/eventStatus";

export default function AdminPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventInsights, setEventInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

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
  const [updateForms, setUpdateForms] = useState({});

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

  const fetchEventInsights = async (eventId) => {
    setInsightsLoading(true);
    try {
      const res = await API.get(`/admin/events/${eventId}/insights`);
      setEventInsights(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to load event insights");
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== "ADMIN" && user.role !== "ORGANIZER") {
      navigate("/");
      return;
    }

    fetchEvents();
    fetchStats();
  }, [user]);

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

  const updateAnnouncementForm = (eventId, changes) => {
    setUpdateForms((currentForms) => ({
      ...currentForms,
      [eventId]: {
        message: "",
        is_important: 0,
        ...(currentForms[eventId] || {}),
        ...changes,
      },
    }));
  };

  const handlePostUpdate = async (eventId) => {
    const formState = updateForms[eventId] || {};
    const message = (formState.message || "").trim();

    if (!message) {
      alert("Enter an announcement message first");
      return;
    }

    try {
      await API.post(`/event-updates/event/${eventId}`, {
        message,
        is_important: formState.is_important ? 1 : 0,
      });
      updateAnnouncementForm(eventId, { message: "", is_important: 0 });
      alert("Event update posted");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to post event update");
    }
  };

  return (
    <div className="page-container">
      <div className="admin-header">
        <div>
          <h2>{user?.role === "ADMIN" ? "Admin Dashboard" : "Organizer Dashboard"}</h2>
          <p className="admin-greeting">Hi {user?.username || (user?.role === "ADMIN" ? "Admin" : "Organizer")}</p>
        </div>

        <button className="admin-logout-btn" onClick={handleAdminLogout}>
          Logout
        </button>
      </div>

      {user?.role === "ADMIN" && (
        <div className="admin-quick-links">
          <Link className="admin-quick-link" to="/admin/analytics">
            Platform Analytics
          </Link>
          <Link className="admin-quick-link" to="/admin/users">
            Users Overview
          </Link>
          <Link className="admin-quick-link" to="/admin/events">
            Events Overview
          </Link>
          <Link className="admin-quick-link" to="/admin/bookings">
            Booking Overview
          </Link>
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Events</h3>
            <p>{stats.total_events}</p>
          </div>

          <div className="stat-card">
            <h3>Upcoming Events</h3>
            <p>{stats.upcoming_events}</p>
          </div>

          <div className="stat-card">
            <h3>Ongoing Events</h3>
            <p>{stats.ongoing_events}</p>
          </div>

          <div className="stat-card">
            <h3>Completed Events</h3>
            <p>{stats.completed_events}</p>
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

      {eventInsights && (
        <section className="card insights-card">
          <div className="insights-header">
            <div>
              <h3>Event Insights</h3>
              <p>{eventInsights.title}</p>
            </div>
            <button className="admin-cancel-btn" onClick={() => setEventInsights(null)}>
              Close Insights
            </button>
          </div>

          {insightsLoading ? (
            <p>Loading insights...</p>
          ) : (
            <div className="insights-grid">
              <div className="insight-box">
                <h4>{eventInsights.total_tickets_sold}</h4>
                <p>Tickets Sold</p>
              </div>
              <div className="insight-box">
                <h4>{eventInsights.remaining_tickets}</h4>
                <p>Remaining Tickets</p>
              </div>
              <div className="insight-box">
                <h4>₹{eventInsights.total_revenue}</h4>
                <p>Total Revenue</p>
              </div>
              <div className="insight-box">
                <h4>{eventInsights.booking_count}</h4>
                <p>Booking Count</p>
              </div>
            </div>
          )}

          {!insightsLoading && (
            <div className="insight-progress">
              <p>Sales Progress</p>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.round(
                      ((eventInsights.total_tickets_sold || 0) /
                        ((eventInsights.total_tickets_sold || 0) +
                          (eventInsights.remaining_tickets || 0) || 1)) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <p>
                {eventInsights.total_tickets_sold} / {eventInsights.total_tickets_sold + eventInsights.remaining_tickets} tickets sold
              </p>
            </div>
          )}
        </section>
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
        {events.map((e) => {
          const displayStatus = getDisplayEventStatus(e);
          const isUnavailable = isEventUnavailable(e);

          return (
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
                    isUnavailable
                      ? "red"
                      : "green",
                }}
              >
                {displayStatus}
              </strong>
            </p>

            {(user.role === "ADMIN" || e.created_by === user.id) && (
              <>
                <div className="admin-actions">
                  <button
                    className="admin-info-btn"
                    onClick={() => fetchEventInsights(e.id)}
                  >
                    View Insights
                  </button>
                  {!isUnavailable && (
                    <>
                      <button
                        className="admin-edit-btn"
                        onClick={() => handleEditEvent(e)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-cancel-btn"
                        onClick={() => handleCancel(e.id)}
                      >
                        Cancel Event
                      </button>
                    </>
                  )}
                </div>

                <div className="event-update-composer">
                  <textarea
                    placeholder="Post a live update for attendees..."
                    value={updateForms[e.id]?.message || ""}
                    onChange={(event) =>
                      updateAnnouncementForm(e.id, {
                        message: event.target.value,
                      })
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(updateForms[e.id]?.is_important)}
                      onChange={(event) =>
                        updateAnnouncementForm(e.id, {
                          is_important: event.target.checked ? 1 : 0,
                        })
                      }
                    />
                    Important
                  </label>
                  <button
                    className="admin-add-btn"
                    type="button"
                    onClick={() => handlePostUpdate(e.id)}
                  >
                    Post Update
                  </button>
                </div>
              </>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
