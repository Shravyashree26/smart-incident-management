import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw, XCircle } from "lucide-react";
import { getAllIssues, getIssueSlaStatus } from "../../api/issuesApi";
import { getAllProjects } from "../../api/projectApi";
import { getAllSlaPolicies } from "../../api/slaApi";
import { showError } from "../../utils/toast";

function getApiMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.statusMessage ||
    err?.message ||
    "Something went wrong"
  );
}

function unwrapData(res) {
  if (!res) return null;
  if (res?.data !== undefined) return res.data;
  return res;
}

function issueCode(issueId) {
  const num = Number(issueId);
  if (Number.isNaN(num)) return "-";
  return `ISS-${String(num).padStart(3, "0")}`;
}

function formatStatus(status) {
  return String(status || "-")
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function statusPillClasses(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "BREACHED") return "bg-red-50 text-red-700 border-red-200";
  if (normalized === "RESOLVED_IN_SLA") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized === "AT_RISK") return "bg-amber-50 text-amber-700 border-amber-200";
  if (normalized === "ON_TRACK") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

function priorityPillClasses(priority) {
  const normalized = String(priority || "").toUpperCase();
  if (normalized === "CRITICAL") return "bg-red-500 text-white";
  if (normalized === "HIGH") return "bg-amber-500 text-white";
  if (normalized === "MEDIUM") return "bg-blue-500 text-white";
  if (normalized === "LOW") return "bg-gray-200 text-gray-700";
  return "bg-gray-100 text-gray-600";
}

function minutesToText(minutes) {
  if (minutes == null || Number.isNaN(Number(minutes))) return "-";
  const total = Number(minutes);
  if (total === 0) return "0m";
  if (total < 0) {
    const overdue = Math.abs(total);
    const h = Math.floor(overdue / 60);
    const m = overdue % 60;
    return `-${h}h ${m}m`;
  }
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function getRemainingMinutes(row) {
  const normalizedStatus = String(row?.slaStatus || "").toUpperCase();
  if (normalizedStatus === "RESOLVED_IN_SLA" || normalizedStatus === "BREACHED") {
    return row?.remainingMinutes ?? null;
  }
  if (row?.slaDueTime) {
    const due = new Date(row.slaDueTime);
    if (!Number.isNaN(due.getTime())) {
      return Math.floor((due.getTime() - Date.now()) / 60000);
    }
  }
  return row?.remainingMinutes ?? null;
}

function resolutionToText(minutes) {
  if (minutes == null || Number.isNaN(Number(minutes))) return "-";
  const total = Number(minutes);
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function SummaryCard({ tone, label, value, icon: Icon }) {
  const styles =
    tone === "red"
      ? { border: "border-red-200", accent: "border-l-4 border-l-red-500", icon: "bg-red-100 text-red-600" }
      : tone === "amber"
        ? { border: "border-amber-200", accent: "border-l-4 border-l-amber-500", icon: "bg-amber-100 text-amber-600" }
        : tone === "blue"
          ? { border: "border-blue-200", accent: "border-l-4 border-l-blue-500", icon: "bg-blue-100 text-blue-600" }
        : { border: "border-emerald-200", accent: "border-l-4 border-l-emerald-500", icon: "bg-emerald-100 text-emerald-600" };

  return (
    <div className={`rounded-xl border bg-white p-4 ${styles.border} ${styles.accent}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-full p-2.5 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-4xl font-bold leading-tight text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function ManagerSlaMonitoring() {
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    setError("");
    try {
      const [issuesRes, projectsRes, policiesRes] = await Promise.all([
        getAllIssues(),
        getAllProjects(),
        getAllSlaPolicies()
      ]);
      const issues = Array.isArray(unwrapData(issuesRes)) ? unwrapData(issuesRes) : [];
      const projectList = Array.isArray(unwrapData(projectsRes)) ? unwrapData(projectsRes) : [];
      const policyList = Array.isArray(unwrapData(policiesRes)) ? unwrapData(policiesRes) : [];

      const withSla = await Promise.all(
        issues.map(async (issue) => {
          try {
            const statusRes = await getIssueSlaStatus(issue.id);
            const sla = unwrapData(statusRes) || {};
            return {
              ...issue,
              slaStatus: sla.status || "UNKNOWN",
              slaDueTime: sla.slaDueTime || null,
              remainingMinutes: sla.remainingMinutes
            };
          } catch {
            return {
              ...issue,
              slaStatus: "UNKNOWN",
              slaDueTime: null,
              remainingMinutes: null
            };
          }
        })
      );

      setRows(withSla);
      setProjects(projectList);
      setPolicies(policyList);
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

  const projectsForFilter = useMemo(() => {
    const map = new Map();
    projects.forEach((project) => {
      if (project?.id != null) map.set(String(project.id), project?.name || `Project #${project.id}`);
    });
    rows.forEach((row) => {
      if (row?.projectId != null && !map.has(String(row.projectId))) {
        map.set(String(row.projectId), row?.projectName || `Project #${row.projectId}`);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const projectMatch =
        projectFilter === "ALL" ? true : String(row?.projectId || "") === String(projectFilter);
      const statusMatch =
        statusFilter === "ALL" ? true : String(row?.slaStatus || "").toUpperCase() === String(statusFilter);
      const haystack =
        `${row?.title || ""} ${row?.projectName || ""} ${row?.severity || ""} ${row?.status || ""} ${row?.slaStatus || ""}`
          .toLowerCase();
      const searchMatch = q ? haystack.includes(q) : true;
      return projectMatch && statusMatch && searchMatch;
    });
  }, [rows, projectFilter, statusFilter, search]);

  const projectNameById = useMemo(() => {
    const map = new Map();
    projects.forEach((project) => {
      if (project?.id != null) map.set(String(project.id), project?.name || `Project #${project.id}`);
    });
    return map;
  }, [projects]);

  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const priorityCards = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  const normalizedPolicies = useMemo(
    () =>
      policies.map((policy) => {
        const pid = policy?.projectId != null ? String(policy.projectId) : "";
        return {
          ...policy,
          projectId: pid,
          projectName:
            policy?.projectName ||
            projectNameById.get(pid) ||
            (pid ? `Project #${pid}` : "-"),
          priorityLevel: String(policy?.priorityLevel || "").toUpperCase()
        };
      }),
    [policies, projectNameById]
  );

  const rulesProjectId = useMemo(() => {
    if (projectFilter !== "ALL") return String(projectFilter);
    return projectsForFilter[0]?.id ? String(projectsForFilter[0].id) : "ALL";
  }, [projectFilter, projectsForFilter]);

  const rulesPolicies = useMemo(() => {
    const list =
      rulesProjectId === "ALL"
        ? normalizedPolicies
        : normalizedPolicies.filter((p) => String(p.projectId) === String(rulesProjectId));
    return list.sort(
      (a, b) =>
        (priorityOrder[a.priorityLevel] ?? 99) - (priorityOrder[b.priorityLevel] ?? 99)
    );
  }, [normalizedPolicies, rulesProjectId]);

  const breachedCount = filteredRows.filter((row) => String(row.slaStatus).toUpperCase() === "BREACHED").length;
  const atRiskCount = filteredRows.filter((row) => String(row.slaStatus).toUpperCase() === "AT_RISK").length;
  const withinSlaCount = filteredRows.filter((row) =>
    String(row.slaStatus).toUpperCase() === "ON_TRACK" && String(row.status || "").toUpperCase() === "IN_PROGRESS"
  ).length;
  const solvedWithinSlaCount = filteredRows.filter((row) =>
    String(row.slaStatus).toUpperCase() === "RESOLVED_IN_SLA"
  ).length;

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SLA Monitoring</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track SLA status for your project issues and identify risk/breach quickly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchData({ silent: true })}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <SummaryCard tone="red" label="SLA Breached" value={breachedCount} icon={XCircle} />
        <SummaryCard tone="amber" label="Near Breach" value={atRiskCount} icon={AlertTriangle} />
        <SummaryCard tone="blue" label="Within SLA" value={withinSlaCount} icon={Clock3} />
        <SummaryCard tone="green" label="Solved Within SLA" value={solvedWithinSlaCount} icon={CheckCircle2} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Project Issue SLA Timers</h2>
        </div>

        <div className="border-b border-gray-200 p-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-2xl font-semibold text-gray-900">SLA Rules Overview</h3>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:w-72"
            >
              <option value="ALL">All Projects</option>
              {projectsForFilter.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {priorityCards.map((priority) => {
              const policy = rulesPolicies.find((p) => p.priorityLevel === priority);
              const badgeClass =
                priority === "CRITICAL"
                  ? "bg-red-500 text-white"
                  : priority === "HIGH"
                    ? "bg-amber-500 text-white"
                    : priority === "MEDIUM"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700";
              return (
                <div key={priority} className="rounded-xl bg-gray-50 p-4">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                    {formatStatus(priority)}
                  </span>
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</p>
                    <p className="mt-1 text-sm text-gray-700">{policy?.description?.trim() || "-"}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Resolution Time</span>
                      <span className="font-semibold text-gray-900">
                        {policy ? resolutionToText(policy.resolutionTimeMinutes) : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-b border-gray-200 p-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by issue title, project, severity, or status..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:w-52"
          >
            <option value="ALL">All SLA Status</option>
            <option value="ON_TRACK">On Track</option>
            <option value="AT_RISK">At Risk</option>
            <option value="BREACHED">Breached</option>
            <option value="RESOLVED_IN_SLA">Resolved In SLA</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="UNKNOWN">Unavailable</option>
          </select>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {filteredRows.length} entr{filteredRows.length === 1 ? "y" : "ies"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Issue ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">SLA Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">SLA Timer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Escalation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-sm text-gray-600">Loading SLA data...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-sm text-gray-700">Failed to load SLA monitoring data: {error}</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-600">No issues found for selected filters.</td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const remaining = getRemainingMinutes(row);
                  const isOverdue = remaining != null && remaining < 0;
                  const timerClass =
                    isOverdue
                      ? "text-red-600"
                      : row.slaStatus === "AT_RISK"
                        ? "text-amber-600"
                        : "text-emerald-600";
                  const escalationText =
                    row.slaStatus === "BREACHED"
                      ? "Escalated"
                      : row.slaStatus === "AT_RISK"
                        ? "Warning"
                        : "Normal";
                  const escalationClass =
                    row.slaStatus === "BREACHED"
                      ? "text-red-600"
                      : row.slaStatus === "AT_RISK"
                        ? "text-amber-600"
                        : "text-gray-700";
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-indigo-600">{issueCode(row.id)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.title || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.projectName || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClasses(row.slaStatus)}`}>
                          {formatStatus(row.slaStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${priorityPillClasses(
                            row.severity
                          )}`}
                        >
                          {formatStatus(row.severity)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${timerClass}`}>{minutesToText(remaining)}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${escalationClass}`}>{escalationText}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
