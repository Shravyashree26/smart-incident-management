import { useEffect, useState } from "react";
import { getAllAuditLogs } from "../../api/auditLogApi";
import { getAllProjects } from "../../api/projectApi";
import { getAllUsers } from "../../api/userApi";
import { showError } from "../../utils/toast";

function getApiMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.statusMessage ||
    err?.message ||
    "Something went wrong"
  );
}

function humanizeToken(value) {
  return String(value || "-")
    .toLowerCase()
    .split("_")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

export default function SuperAdminLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [userNameById, setUserNameById] = useState(new Map());
  const [projectNameById, setProjectNameById] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError("");
      try {
        const [logsRes, usersRes, projectsRes] = await Promise.all([
          getAllAuditLogs(),
          getAllUsers(),
          getAllProjects()
        ]);

        const logsData = logsRes?.data ?? logsRes;
        const usersData = usersRes?.data ?? usersRes;
        const projectsData = projectsRes?.data ?? projectsRes;

        setLogs(Array.isArray(logsData) ? logsData : []);

        const userMap = new Map();
        (Array.isArray(usersData) ? usersData : []).forEach((u) => {
          if (u?.id != null) {
            userMap.set(
              Number(u.id),
              u?.fullName || u?.email || `User #${u.id}`
            );
          }
        });
        setUserNameById(userMap);

        const projectMap = new Map();
        (Array.isArray(projectsData) ? projectsData : []).forEach((p) => {
          if (p?.id != null) {
            projectMap.set(Number(p.id), p?.name || p?.projectName || `Project #${p.id}`);
          }
        });
        setProjectNameById(projectMap);
      } catch (err) {
        const msg = getApiMessage(err);
        setError(msg);
        showError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const resolveEntityText = (log) => {
    const type = String(log?.entityType || "").toUpperCase();
    const entityId = log?.entityId != null ? Number(log.entityId) : null;
    if (!type) return "-";

    if (type === "USER") {
      const userName = entityId != null ? userNameById.get(entityId) : "";
      return userName ? `User: ${userName}` : `User${entityId != null ? ` #${entityId}` : ""}`;
    }

    if (type === "PROJECT") {
      const projectName = entityId != null ? projectNameById.get(entityId) : "";
      return projectName
        ? `Project: ${projectName}`
        : `Project${entityId != null ? ` #${entityId}` : ""}`;
    }

    return `${humanizeToken(type)}${entityId != null ? ` #${entityId}` : ""}`;
  };

  const displayLogs = logs
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .filter((log) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = `${log?.actorEmail || ""} ${log?.actorRole || ""} ${humanizeToken(log?.action)} ${resolveEntityText(log)} ${log?.description || ""}`.toLowerCase();
      return hay.includes(q);
    });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-600">
            System-wide audit trail of important actions.
          </p>
        </div>
        <div className="text-sm text-gray-600">
          {logs.length} entr{logs.length === 1 ? "y" : "ies"}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50/60 p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, action, entity, or description..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Time
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Role
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Action
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Entity
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-gray-600">
                  Loading logs...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-gray-700">
                  Failed to load logs: {error}
                </td>
              </tr>
            ) : displayLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-600">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              displayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-700 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-800">
                      {log.actorEmail || "-"}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700 uppercase">
                      {log.actorRole || "-"}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-800">
                      {humanizeToken(log.action)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {resolveEntityText(log)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700 max-w-xs">
                      <div className="line-clamp-2">{log.description || "-"}</div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
