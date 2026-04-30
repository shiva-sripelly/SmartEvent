import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLoginPage() {
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
        alert("Admin/Organizer access required");
        return;
      }

      if (profile.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/organizer");
      }
    } catch {
      alert("Admin login failed");
    }
  };

  return (
    <div className="auth-container">
      <h2>Admin / Organizer Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Enter Admin Email"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Enter Admin Password"
          onChange={handleChange}
          required
        />

        <button type="submit">Login as Admin</button>
      </form>
    </div>
  );
}