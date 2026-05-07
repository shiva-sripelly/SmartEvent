import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");

  const token = params.get("token");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleReset = async (e) => {
    e.preventDefault();

    try {
      await API.post("/auth/reset-password", {
        token,
        new_password: form.newPassword,
        confirm_password: form.confirmPassword,
      });

      setMessage(t("passwordResetSuccessful"));

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.detail || t("passwordResetFailed"));
    }
  };

  return (
    <div className="auth-container">
      <h2>{t("resetPassword")}</h2>

      <form onSubmit={handleReset}>
        <input
          type="password"
          name="newPassword"
          placeholder={t("enterNewPassword")}
          value={form.newPassword}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder={t("confirmNewPassword")}
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        <button type="submit">{t("resetPassword")}</button>
      </form>

      {message && <p className="success-message">{message}</p>}
    </div>
  );
}


