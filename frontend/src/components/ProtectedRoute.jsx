import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) return <h2 className="loading">{t("loading")}</h2>;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

