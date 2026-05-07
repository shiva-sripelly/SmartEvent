import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";

export default function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const handleChange = (e) => {
  setForm({ ...form, [e.target.name]: e.target.value });
  setError(""); // clear error while typing
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
  const msg =
    err.response?.data?.detail || t("invalidEmailOrPassword");
  setError(msg);
}
  };

  return (
    <div className="auth-container">
      <h2>{t("login")}</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder={t("enterEmail")}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder={t("enterPassword")}
          onChange={handleChange}
          required
        />

        <button type="submit">{t("login")}</button>
        {error && <p className="error-text">{error}</p>}
        <Link to="/register" className="admin-login-link">
          {t("createNewAccount")}
        </Link>

        <Link to="/forgot-password" className="admin-login-link">
          {t("forgotPassword")}
        </Link>

        <Link to="/admin-login" className="admin-login-link">
          {t("adminLogin")}
        </Link>
      </form>
    </div>
  );
}


