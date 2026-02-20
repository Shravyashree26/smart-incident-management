import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../../api/userApi";
import { showError, showSuccess } from "../../utils/toast";
import { useAuth } from "../../context/useAuth";
import { getDashboardPathByRole } from "../../utils/roleRouting";

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const { user, updateAuth, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasPwInput = (newPassword || "").length > 0 || (confirmPassword || "").length > 0;
  const pwMatches = (newPassword || "").length > 0 && newPassword === confirmPassword;
  const pwMismatch = hasPwInput && newPassword !== confirmPassword;

  const passwordFieldClasses = pwMatches
    ? "border-green-500 focus:ring-2 focus:ring-green-500"
    : pwMismatch
      ? "border-red-500 focus:ring-2 focus:ring-red-500"
      : "border-gray-300 focus:ring-2 focus:ring-indigo-500";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if ((newPassword || "").length < 6) {
      showError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      const data = res?.data;

      if (!data?.token) {
        showError("Password changed, but no token returned. Please log in again.");
        await logout?.();
        window.location.href = "/login";
        return;
      }

      updateAuth?.(data.token);
      showSuccess("Password updated successfully");

      const role = data?.role || user?.role;
      const dashboardPath = getDashboardPathByRole(role);

      navigate(dashboardPath, { replace: true });
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6">
      <h1 className="text-xl font-bold text-gray-900">Change your password</h1>
      <p className="mt-2 text-sm text-gray-600">
        For security, you must change your password before continuing.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Current password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 pr-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-indigo-600"
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            New password
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={`w-full rounded-xl border px-3 py-2 pr-11 text-sm outline-none ${passwordFieldClasses}`}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-indigo-600"
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Confirm new password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full rounded-xl border px-3 py-2 pr-11 text-sm outline-none ${passwordFieldClasses}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-indigo-600"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {pwMatches && (
            <p className="mt-1 text-xs font-medium text-green-700">
              Passwords match
            </p>
          )}
          {pwMismatch && (
            <p className="mt-1 text-xs font-medium text-red-700">
              Passwords do not match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
