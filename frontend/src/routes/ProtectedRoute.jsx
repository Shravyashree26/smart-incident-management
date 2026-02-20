import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { normalizeRole } from "../utils/roleRouting";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user } = useAuth();
  const location = useLocation();
  const forceChangePath = "/force-change-password";

  // Redirect to login if not authenticated
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Force password change on first login
  if (user?.mustChangePassword && location.pathname !== forceChangePath) {
    return <Navigate to={forceChangePath} replace state={{ from: location }} />;
  }

  // Role protection
  if (
    allowedRoles &&
    !allowedRoles.includes(normalizeRole(user?.role))
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
