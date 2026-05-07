import { useState } from "react";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    email: "",
    confirmEmail: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleReset = async (e) => {
    e.preventDefault();

    if (form.email !== form.confirmEmail) {
      setMessage(t("emailsDoNotMatch"));
      return;
    }

    try {
      await API.post("/auth/forgot-password", {
        email: form.email,
        confirm_email: form.confirmEmail,
      });

      setMessage(t("resetInstructionsSent"));
    } catch (err) {
      setMessage(err.response?.data?.detail || t("resetRequestFailed"));
    }
  };

  return (
    <div className="auth-container">
      <h2>{t("forgotPasswordTitle")}</h2>

      <form onSubmit={handleReset}>
        <input
          type="email"
          name="email"
          placeholder={t("enterEmail")}
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="confirmEmail"
          placeholder={t("confirmEmail")}
          value={form.confirmEmail}
          onChange={handleChange}
          required
        />

        <button type="submit">{t("clickHereToReset")}</button>
      </form>

      {message && <p className="success-message">{message}</p>}
    </div>
 );
}


