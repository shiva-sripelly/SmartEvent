import { useState } from "react";
import API from "../api/axios";

export default function ForgotPasswordPage() {
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
      setMessage("Emails do not match");
      return;
    }

    try {
      await API.post("/auth/forgot-password", {
        email: form.email,
        confirm_email: form.confirmEmail,
      });

      setMessage("Password reset instructions sent to your email.");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Reset request failed");
    }
  };

  return (
    <div className="auth-container">
      <h2>Forgot Password</h2>

      <form onSubmit={handleReset}>
        <input
          type="email"
          name="email"
          placeholder="Enter Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="confirmEmail"
          placeholder="Confirm Email"
          value={form.confirmEmail}
          onChange={handleChange}
          required
        />

        <button type="submit">Click Here to Reset</button>
      </form>

      {message && <p className="success-message">{message}</p>}
    </div>
 );
}