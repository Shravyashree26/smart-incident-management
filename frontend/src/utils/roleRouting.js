export function normalizeRole(role) {
  const raw = String(role || "").trim().toUpperCase();
  if (!raw) return "";
  return raw.startsWith("ROLE_") ? raw.slice(5) : raw;
}

export function getDashboardPathByRole(role) {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "SUPER_ADMIN":
      return "/superadmin/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "ENGINEER":
      return "/engineer/dashboard";
    default:
      return "/user/dashboard";
  }
}
