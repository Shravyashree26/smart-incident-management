import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPathByRole } from "../utils/roleRouting";

export default function PublicRoute({ children }) {
  const { token, user } = useAuth();

  // If user is authenticated, redirect to their dashboard
  if (token && user) {
    if (user?.mustChangePassword) {
      return <Navigate to="/force-change-password" replace />;
    }

    return <Navigate to={getDashboardPathByRole(user?.role)} replace />;
  }

  return children;
}
