import { useEffect, useState } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getSafeImageUrl } from "../utils/imageUrl";

export default function ProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    profile_picture: null,
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || "",
        email: user.email || "",
        profile_picture: null,
      });
      setPreviewUrl(getSafeImageUrl(user.profile_picture) || "");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      const res = await API.get("/auth/profile/summary");
      setSummary(res.data);
    };

    fetchSummary().catch((err) => {
      setError(err.response?.data?.detail || "Unable to load activity summary.");
    });
  }, [user]);

  const updateField = (key, value) => {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
    setMessage("");
    setError("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    updateField("profile_picture", file);
    setPreviewUrl(file ? URL.createObjectURL(file) : getSafeImageUrl(user?.profile_picture) || "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("username", form.username);
      formData.append("email", form.email);
      if (form.profile_picture) {
        formData.append("profile_picture", form.profile_picture);
      }

      await API.put("/auth/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchProfile();
      setForm((currentForm) => ({ ...currentForm, profile_picture: null }));
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.username || user?.username || "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page-container profile-page">
      <div className="page-header-row">
        <div>
          <h2>My Profile</h2>
          <p className="subtle-text">Manage your account details and view booking activity.</p>
        </div>
      </div>

      <div className="profile-layout">
        <section className="overview-card profile-card">
          <div className="profile-avatar">
            {previewUrl ? (
              <img src={previewUrl} alt={`${form.username || "User"} profile`} />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div>
            <h3>{user?.username || "SmartEvent User"}</h3>
            <p>{user?.email}</p>
            <span className="status-pill confirmed">{user?.role || "USER"}</span>
          </div>
        </section>

        <form className="admin-form profile-form" onSubmit={handleSubmit}>
          <h3>Edit Profile</h3>

          <div className="admin-form-grid">
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              required
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />

            <button className="admin-add-btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

          {message && <div className="success-message profile-message">{message}</div>}
          {error && <div className="error-text profile-message">{error}</div>}
        </form>
      </div>

      <section className="overview-card">
        <h3>Activity Summary</h3>
        <div className="stats-grid profile-summary-grid">
          <div className="stat-card">
            <h3>Total Bookings</h3>
            <p>{summary?.total_bookings || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Upcoming Events</h3>
            <p>{summary?.upcoming_events || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Tickets Booked</h3>
            <p>{summary?.total_tickets || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Spent</h3>
            <p>Rs.{summary?.total_spent || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p>{summary?.pending_bookings || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Closed Events</h3>
            <p>{summary?.cancelled_or_expired || 0}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
