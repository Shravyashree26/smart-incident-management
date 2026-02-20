import { ChevronRight, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SIDEBAR_CONFIG } from "../../config/sidebarConfig";
import { useAuth } from "../../context/useAuth";
import { normalizeRole } from "../../utils/roleRouting";

function toTitleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPageLabel(pathname, role) {
  const items = SIDEBAR_CONFIG?.[role] || [];
  const match = items.find((i) => i.path === pathname);
  if (match?.label) return match.label;

  if (pathname === "/profile/edit") return "Edit Profile";
  if (pathname === "/profile/change-password") return "Change Password";
  if (pathname === "/force-change-password") return "Force Change Password";

  const fallbackSegment = pathname.split("/").filter(Boolean).pop();
  return toTitleCase(fallbackSegment || "Page");
}

export default function AppBreadcrumb() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = normalizeRole(user?.role);
  const pageLabel = getPageLabel(location.pathname, role);

  const dashboardPath =
    (SIDEBAR_CONFIG?.[role] || []).find((item) => item.label === "Dashboard")?.path || "/";

  return (
    <div className="mb-3 px-1">
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="text-gray-500 hover:text-indigo-600"
          title="Go to dashboard"
        >
          <Home className="h-4 w-4" />
        </button>

        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="font-semibold text-gray-900">{pageLabel}</span>
      </div>
    </div>
  );
}
