import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthCard from "../../components/auth/AuthCard";
import LoadingButton from "../../components/common/LoadingButton";
import { login } from "../../api/authApi";
import { showSuccess, showError } from "../../utils/toast";
import bgImage from "../../assets/background.png";
import { useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { getDashboardPathByRole } from "../../utils/roleRouting";

export default function Login() {
  const navigate = useNavigate();
  const { token, user, updateAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 🔐 BLOCK BACK/FORWARD TO LOGIN WHEN LOGGED IN
  useEffect(() => {
    if (token && user) {
      navigate(getDashboardPathByRole(user?.role), {
        replace: true
      });
    }
  }, [token, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const res = await login(email, password);
      const data = res?.data?.data;

      if (!data?.token || !data?.role) {
        showError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Update auth state immediately
      if (updateAuth) {
        updateAuth(data.token);
      } else {
        // Fallback: update localStorage and trigger state update
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
        // Trigger custom event to update auth state
        window.dispatchEvent(new CustomEvent("authUpdate", { detail: { token: data.token } }));
      }

      // Determine dashboard path based on role
      const dashboardPath = getDashboardPathByRole(data.role);

      // Use a small delay to ensure state is updated before navigation
      // This ensures ProtectedRoute sees the updated auth state
      setTimeout(() => {
        if (data?.mustChangePassword) {
          navigate("/force-change-password", { replace: true });
        } else {
          navigate(dashboardPath, { replace: true });
        }
        
        // Show success message after navigation
        setTimeout(() => {
          showSuccess("Welcome to ServicePulse");
        }, 100);
      }, 50);
    } catch (err) {
      showError(
        err?.response?.data?.message || "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center px-4"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-white/20" />

      <div className="relative z-10">
        <AuthCard
          title="Welcome back"
          subtitle="Sign in to your ServicePlus account"
          footer={
            <Link
              to="/forgot-password"
              className="text-blue-600 font-medium hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white/40 backdrop-blur px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 bg-white/40 backdrop-blur px-4 py-2.5 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-indigo-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <LoadingButton
              loading={loading}
              text="Login"
              loadingText="Logging in..."
            />
          </form>
        </AuthCard>
      </div>
    </div>
  );
}
