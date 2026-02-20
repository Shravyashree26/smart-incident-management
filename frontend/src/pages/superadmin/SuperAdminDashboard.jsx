import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  ClipboardList,
  RefreshCcw,
  ShieldCheck,
  Users
} from "lucide-react";
import { getAllUsers } from "../../api/userApi";
import { getAllProjects } from "../../api/projectApi";
import { getAllAuditLogs } from "../../api/auditLogApi";
import { showError } from "../../utils/toast";

const ROLE_ORDER = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ENGINEER", "USER"];
const ROLE_COLORS = {
  SUPER_ADMIN: "bg-rose-500",
  ADMIN: "bg-blue-500",
  MANAGER: "bg-amber-500",
  ENGINEER: "bg-emerald-500",
  USER: "bg-violet-500"
};
const LOG_WINDOW_OPTIONS = [
  { value: "24H", label: "Last 24h" },
  { value: "7D", label: "Last 7d" },
  { value: "30D", label: "Last 30d" },
  { value: "ALL", label: "All time" }
];

function getApiMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.statusMessage ||
    err?.message ||
    "Something went wrong"
  );
}

function unwrapApiData(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  return Array.isArray(res?.data?.data) ? res.data.data : [];
}

function safeDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeAgo(input) {
  const date = safeDate(input);
  if (!date) return "-";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function humanizeToken(value) {
  return String(value || "-")
    .toLowerCase()
    .split("_")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        </div>
        <div className="rounded-xl bg-gray-100 p-2 text-gray-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function BarList({ items, emptyText }) {
  if (!items.length) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{item.label}</span>
            <span className="text-gray-500">{item.value}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full ${item.color}`}
              style={{ width: `${Math.max((item.value / max) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusDonut({ values, selected, onSelect }) {
  const total = values.active + values.disabled + values.locked;
  const r = 52;
  const c = 2 * Math.PI * r;
  const safeTotal = Math.max(total, 1);
  const activeLen = (values.active / safeTotal) * c;
  const disabledLen = (values.disabled / safeTotal) * c;
  const lockedLen = (values.locked / safeTotal) * c;

  const selectedValue =
    selected === "active"
      ? values.active
      : selected === "disabled"
        ? values.disabled
        : values.locked;

  const strokeFor = (key) => (selected === key ? 18 : 14);
  const opacityFor = (key) => (selected === key ? 1 : 0.45);

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
      <div className="relative h-52 w-52">
        <svg viewBox="0 0 140 140" className="h-52 w-52 -rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#eef2ff" strokeWidth="14" />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#16a34a"
            strokeWidth={strokeFor("active")}
            strokeDasharray={`${activeLen} ${c - activeLen}`}
            strokeLinecap="butt"
            className="cursor-pointer transition-all"
            opacity={opacityFor("active")}
            onClick={() => onSelect("active")}
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeFor("disabled")}
            strokeDasharray={`${disabledLen} ${c - disabledLen}`}
            strokeDashoffset={-activeLen}
            strokeLinecap="butt"
            className="cursor-pointer transition-all"
            opacity={opacityFor("disabled")}
            onClick={() => onSelect("disabled")}
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeFor("locked")}
            strokeDasharray={`${lockedLen} ${c - lockedLen}`}
            strokeDashoffset={-(activeLen + disabledLen)}
            strokeLinecap="butt"
            className="cursor-pointer transition-all"
            opacity={opacityFor("locked")}
            onClick={() => onSelect("locked")}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">{selected}</p>
            <p className="text-3xl font-bold text-gray-900">{selectedValue}</p>
            <p className="text-xs text-gray-500">of {total}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <button
          type="button"
          onClick={() => onSelect("active")}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-gray-700 ${
            selected === "active" ? "bg-green-50 ring-1 ring-green-200" : ""
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
          Active: <span className="font-semibold">{values.active}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("disabled")}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-gray-700 ${
            selected === "disabled" ? "bg-amber-50 ring-1 ring-amber-200" : ""
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Disabled: <span className="font-semibold">{values.disabled}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("locked")}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-gray-700 ${
            selected === "locked" ? "bg-red-50 ring-1 ring-red-200" : ""
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          Locked: <span className="font-semibold">{values.locked}</span>
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [logWindow, setLogWindow] = useState("7D");
  const [logSearch, setLogSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("active");

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    setError("");
    try {
      const [usersRes, projectsRes, logsRes] = await Promise.all([
        getAllUsers(),
        getAllProjects(),
        getAllAuditLogs()
      ]);
      setUsers(unwrapApiData(usersRes));
      setProjects(unwrapApiData(projectsRes));
      setLogs(unwrapApiData(logsRes));
      setLastUpdated(new Date());
    } catch (err) {
      const msg = getApiMessage(err);
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const companies = useMemo(() => {
    const set = new Set(
      users
        .map((u) => String(u?.company || "").trim())
        .filter(Boolean)
    );
    return Array.from(set);
  }, [users]);

  const roleDistribution = useMemo(() => {
    return ROLE_ORDER.map((role) => ({
      label: role,
      value: users.filter((u) => String(u?.role || "") === role).length,
      color: ROLE_COLORS[role] || "bg-gray-400"
    }));
  }, [users]);

  const topCompanies = useMemo(() => {
    const counts = new Map();
    users.forEach((u) => {
      const company = String(u?.company || "").trim();
      if (!company) return;
      counts.set(company, (counts.get(company) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value, color: "bg-indigo-500" }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [users]);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const ad = safeDate(a?.timestamp)?.getTime() || 0;
      const bd = safeDate(b?.timestamp)?.getTime() || 0;
      return bd - ad;
    });
  }, [logs]);

  const logsInWindow = useMemo(() => {
    if (logWindow === "ALL") return sortedLogs;
    const now = Date.now();
    const hours = logWindow === "24H" ? 24 : logWindow === "7D" ? 24 * 7 : 24 * 30;
    return sortedLogs.filter((log) => {
      const ts = safeDate(log?.timestamp)?.getTime();
      if (!ts) return false;
      return now - ts <= hours * 60 * 60 * 1000;
    });
  }, [sortedLogs, logWindow]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return logsInWindow;
    return logsInWindow
      .filter((log) => {
        const hay = `${log?.actorEmail || ""} ${log?.action || ""} ${log?.entityType || ""} ${log?.description || ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [logsInWindow, logSearch]);

  const userNameById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      if (u?.id != null) map.set(Number(u.id), u?.fullName || u?.email || `User #${u.id}`);
    });
    return map;
  }, [users]);

  const projectNameById = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      if (p?.id != null) map.set(Number(p.id), p?.name || p?.projectName || `Project #${p.id}`);
    });
    return map;
  }, [projects]);

  const resolveEntityText = (log) => {
    const type = String(log?.entityType || "").toUpperCase();
    const entityId = log?.entityId != null ? Number(log.entityId) : null;
    if (!type) return "-";
    if (type === "USER") {
      const name = entityId != null ? userNameById.get(entityId) : "";
      return name ? `User: ${name}` : `User${entityId != null ? ` #${entityId}` : ""}`;
    }
    if (type === "PROJECT") {
      const name = entityId != null ? projectNameById.get(entityId) : "";
      return name ? `Project: ${name}` : `Project${entityId != null ? ` #${entityId}` : ""}`;
    }
    return `${humanizeToken(type)}${entityId != null ? ` #${entityId}` : ""}`;
  };

  const statusValues = useMemo(() => {
    let active = 0;
    let disabled = 0;
    let locked = 0;
    users.forEach((u) => {
      if (u?.locked === true) locked += 1;
      if (u?.enabled === false) disabled += 1;
      if (u?.enabled !== false && u?.locked !== true) active += 1;
    });
    return { active, disabled, locked };
  }, [users]);

  const mustChangePasswordCount = useMemo(
    () => users.filter((u) => u?.mustChangePassword === true).length,
    [users]
  );

  const companyAdmins = users.filter((u) => String(u?.role || "") === "ADMIN");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-200">
              Live overview of users, companies, projects, and platform activity.
            </p>
            <p className="mt-2 text-xs text-slate-300">
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchData({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading dashboard data...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Failed to load dashboard data: {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Users}
              label="Total Users"
              value={users.length}
              hint={`${statusValues.active} active accounts`}
            />
            <StatCard
              icon={Building2}
              label="Companies"
              value={companies.length}
              hint={`${companyAdmins.length} company admins`}
            />
            <StatCard
              icon={ClipboardList}
              label="First-Login Resets"
              value={mustChangePasswordCount}
              hint="Users that must change password"
            />
            <StatCard
              icon={Activity}
              label="Audit Events"
              value={logsInWindow.length}
              hint={`Within ${LOG_WINDOW_OPTIONS.find((o) => o.value === logWindow)?.label || "window"}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-1">
              <h2 className="text-base font-semibold text-gray-900">User Status</h2>
              <p className="mt-1 text-sm text-gray-500">
                Click status to highlight and inspect account totals.
              </p>
              <div className="mt-4">
                <StatusDonut
                  values={statusValues}
                  selected={selectedStatus}
                  onSelect={setSelectedStatus}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-1">
              <h2 className="text-base font-semibold text-gray-900">Role Distribution</h2>
              <p className="mt-1 text-sm text-gray-500">Users split by role.</p>
              <div className="mt-4">
                <BarList items={roleDistribution} emptyText="No users found." />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-1">
              <h2 className="text-base font-semibold text-gray-900">Top Companies</h2>
              <p className="mt-1 text-sm text-gray-500">Companies with the most users.</p>
              <div className="mt-4 max-h-[12rem] overflow-y-auto pr-1">
                <BarList items={topCompanies} emptyText="No company data found." />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 2xl:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Recent Audit Activity</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Track sensitive operations and user actions.
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={logWindow}
                    onChange={(e) => setLogWindow(e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {LOG_WINDOW_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter logs by email, action, entity, or description..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="mt-4 max-h-[32rem] overflow-y-auto overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Email
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Action
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Entity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                          No logs found for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-800">{log.actorEmail || "-"}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-800">
                            {humanizeToken(log.action)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {resolveEntityText(log)}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-600">
                            <div>{safeDate(log.timestamp)?.toLocaleString() || "-"}</div>
                            <div className="text-[11px] text-gray-500">{timeAgo(log.timestamp)}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <h2 className="text-base font-semibold text-gray-900">Company Admin Directory</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">Quick view of admin ownership by company.</p>

              <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {companyAdmins.length === 0 ? (
                  <p className="text-sm text-gray-500">No company admins found.</p>
                ) : (
                  companyAdmins
                    .slice()
                    .sort((a, b) => String(a.company || "").localeCompare(String(b.company || "")))
                    .map((admin) => (
                      <div
                        key={admin.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-gray-800">{admin.company || "-"}</p>
                        <p className="text-xs text-gray-600">{admin.fullName || "-"}</p>
                        <p className="text-xs text-gray-500">{admin.email || "-"}</p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
