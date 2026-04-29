import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
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
    err.response?.data?.detail || "Invalid email or password";
  setError(msg);
}
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Enter Email"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Enter Password"
          onChange={handleChange}
          required
        />

        <button type="submit">Login</button>
        {error && <p className="error-text">{error}</p>}
        <Link to="/register" className="admin-login-link">
          Create New Account
        </Link>

        <Link to="/forgot-password" className="admin-login-link">
          Forgot Password?
        </Link>

        <Link to="/admin-login" className="admin-login-link">
          Admin Login
        </Link>
      </form>
    </div>
  );
}