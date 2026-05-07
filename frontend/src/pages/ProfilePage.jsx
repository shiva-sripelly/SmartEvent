import { useEffect, useState } from "react";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";
import { useAuth } from "../context/AuthContext";
import { getSafeImageUrl } from "../utils/imageUrl";

export default function ProfilePage() {
  const { t } = useLanguage();
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
      setError(err.response?.data?.detail || t("profileUpdateFailed"));
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
      setMessage(t("profileUpdated"));
    } catch (err) {
      setError(err.response?.data?.detail || t("profileUpdateFailed"));
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
          <h2>{t("myProfile")}</h2>
          <p className="subtle-text">{t("profileSubtitle")}</p>
        </div>
      </div>

      <div className="profile-layout">
        <section className="overview-card profile-card">
          <div className="profile-avatar">
            {previewUrl ? (
              <img src={previewUrl} alt={`${form.username || t("smartEventUser")} profile`} />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div>
            <h3>{user?.username || t("smartEventUser")}</h3>
            <p>{user?.email}</p>
            <span className="status-pill confirmed">{user?.role || "USER"}</span>
          </div>
        </section>

        <form className="admin-form profile-form" onSubmit={handleSubmit}>
          <h3>{t("editProfile")}</h3>

          <div className="admin-form-grid">
            <input
              name="username"
              placeholder={t("username")}
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              required
            />

            <input
              name="email"
              type="email"
              placeholder={t("email")}
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
              {saving ? t("saving") : t("saveProfile")}
            </button>
          </div>

          {message && <div className="success-message profile-message">{message}</div>}
          {error && <div className="error-text profile-message">{error}</div>}
        </form>
      </div>

      <section className="overview-card">
        <h3>{t("activitySummary")}</h3>
        <div className="stats-grid profile-summary-grid">
          <div className="stat-card">
            <h3>{t("totalBookings")}</h3>
            <p>{summary?.total_bookings || 0}</p>
          </div>
          <div className="stat-card">
            <h3>{t("upcomingEvents")}</h3>
            <p>{summary?.upcoming_events || 0}</p>
          </div>
          <div className="stat-card">
            <h3>{t("ticketsBooked")}</h3>
            <p>{summary?.total_tickets || 0}</p>
          </div>
          <div className="stat-card">
            <h3>{t("totalSpent")}</h3>
            <p>Rs.{summary?.total_spent || 0}</p>
          </div>
          <div className="stat-card">
            <h3>{t("pending")}</h3>
            <p>{summary?.pending_bookings || 0}</p>
          </div>
          <div className="stat-card">
            <h3>{t("closedEvents")}</h3>
            <p>{summary?.cancelled_or_expired || 0}</p>
          </div>
          <div className="stat-card">
            <h3>{t("rewardPoints")}</h3>
            <p>{summary?.reward_points || 0}</p>
            <span className="subtle-text">{t("rewardPointsHelp")}</span>
          </div>
          <div className="stat-card">
            <h3>{t("successfulReferrals")}</h3>
            <p>{summary?.referral_count || 0}</p>
            <span className="subtle-text">
              {t("referralPointsValue", {
                points: summary?.reward_points_from_referrals || 0,
              })}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}



