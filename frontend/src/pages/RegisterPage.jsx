import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";

export default function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    referralCode: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form.username, form.email, form.password, form.referralCode);
      alert(t("registeredSuccessfully"));
      navigate("/login");
    } catch {
      alert(t("registrationFailed"));
    }
  };

  return (
    <div className="auth-container">
      <h2>{t("register")}</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder={t("enterUsername")}
          onChange={handleChange}
          required
        />

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

        <input
          type="text"
          name="referralCode"
          placeholder={t("referralCodeOptional")}
          onChange={handleChange}
        />

        <button type="submit">{t("register")}</button>
      </form>

      <button
        type="button"
        className="secondary-button"
        onClick={() => navigate("/login")}
      >
        {t("alreadyHaveAccount")}
      </button>
    </div>
  );
}


