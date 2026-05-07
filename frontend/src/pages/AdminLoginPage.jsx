import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";

export default function AdminLoginPage() {
  const { t } = useLanguage();
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (!user) return;
    if (user.role === "ADMIN") {
      navigate("/admin");
    } else if (user.role === "ORGANIZER") {
      navigate("/organizer");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const profile = await login(form.email, form.password);

      if (!profile || (profile.role !== "ADMIN" && profile.role !== "ORGANIZER")) {
        logout();
        alert(t("adminOrganizerRequired"));
        return;
      }

      if (profile.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/organizer");
      }
    } catch {
      alert(t("adminLoginFailed"));
    }
  };

  return (
    <div className="auth-container">
      <h2>{t("adminOrganizerLogin")}</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder={t("enterAdminEmail")}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder={t("enterAdminPassword")}
          onChange={handleChange}
          required
        />

        <button type="submit">{t("loginAsAdmin")}</button>
      </form>
    </div>
  );
}


