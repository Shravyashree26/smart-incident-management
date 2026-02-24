import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Eye, RefreshCcw } from "lucide-react";
import { addIssueComment, getAllIssues, updateIssueStatus } from "../../api/issuesApi";
import { getAllProjects } from "../../api/projectApi";
import { showError, showSuccess } from "../../utils/toast";

function getApiMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.statusMessage ||
    err?.message ||
    "Something went wrong"
  );
}

function unwrapArrayData(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

function issueCode(id) {
  const num = Number(id);
  if (Number.isNaN(num)) return "-";
  return `ISS-${String(num).padStart(3, "0")}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "-";
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
  return `${datePart} ${timePart}`;
}

export default function ManagerResolvedIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [savingIssueId, setSavingIssueId] = useState(null);
  const [feedbackByIssueId, setFeedbackByIssueId] = useState({});

  const fetchResolved = async () => {
    setLoading(true);
    setError("");
    try {
      const [issuesRes, projectsRes] = await Promise.all([getAllIssues(), getAllProjects()]);
      const resolved = unwrapArrayData(issuesRes).filter(
        (issue) => String(issue?.status || "").toUpperCase() === "RESOLVED"
      );
      setProjects(unwrapArrayData(projectsRes));
      setIssues(resolved);
    } catch (err) {
      const msg = getApiMessage(err);
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResolved();
  }, []);

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((issue) => {
      const projectId = String(issue?.projectId || "");
      const priority = String(issue?.severity || "").toUpperCase();
      const matchesProject = projectFilter === "ALL" ? true : projectId === String(projectFilter);
      const matchesPriority = priorityFilter === "ALL" ? true : priority === priorityFilter;
      const haystack = `${issue?.title || ""} ${issue?.description || ""} ${issue?.projectName || ""} ${issue?.assignedEngineerName || ""}`.toLowerCase();
      const matchesSearch = q ? haystack.includes(q) : true;
      return matchesProject && matchesPriority && matchesSearch;
    });
  }, [issues, search, projectFilter, priorityFilter]);

  const projectsForFilter = useMemo(() => {
    const map = new Map();
    projects.forEach((project) => {
      if (project?.id != null) {
        map.set(String(project.id), project?.name || `Project #${project.id}`);
      }
    });
    issues.forEach((issue) => {
      if (issue?.projectId != null) {
        map.set(String(issue.projectId), issue?.projectName || `Project #${issue.projectId}`);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [issues, projects]);

  const handleCloseIssue = async (issueId) => {
    try {
      setSavingIssueId(issueId);
      await updateIssueStatus(issueId, "CLOSED");
      setIssues((prev) => prev.filter((item) => item.id !== issueId));
      showSuccess("Issue closed successfully");
    } catch (err) {
      showError(getApiMessage(err));
    } finally {
      setSavingIssueId(null);
    }
  };

  const handleReturnForRework = async (issueId) => {
    const feedback = String(feedbackByIssueId[issueId] || "").trim();
    if (!feedback) {
      showError("Please add a comment before sending issue back to engineer");
      return;
    }
    try {
      setSavingIssueId(issueId);
      await addIssueComment(issueId, feedback);
      await updateIssueStatus(issueId, "OPEN");
      setIssues((prev) => prev.filter((item) => item.id !== issueId));
      setFeedbackByIssueId((prev) => ({ ...prev, [issueId]: "" }));
      showSuccess("Issue returned to engineer with comment");
    } catch (err) {
      showError(getApiMessage(err));
    } finally {
      setSavingIssueId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Resolved Issues</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review issues marked resolved by engineers, then close or return with comment.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchResolved}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, project, engineer..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 lg:col-span-2"
          />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All projects</option>
            {projectsForFilter.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Issue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Project</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Engineer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Resolved At</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Manager Feedback</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-sm text-gray-600" colSpan={6}>
                  Loading resolved issues...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-8 text-sm text-red-700" colSpan={6}>
                  Failed to load issues: {error}
                </td>
              </tr>
            ) : filteredIssues.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-600" colSpan={6}>
                  No resolved issues pending review.
                </td>
              </tr>
            ) : (
              filteredIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {issueCode(issue.id)} - {issue.title || "-"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">{issue.description || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{issue.projectName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {issue.assignedEngineerName || issue.assignedToName || issue.assignedTo || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-gray-500" />
                      {formatDateTime(issue.resolvedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      rows={2}
                      value={feedbackByIssueId[issue.id] || ""}
                      onChange={(e) =>
                        setFeedbackByIssueId((prev) => ({
                          ...prev,
                          [issue.id]: e.target.value
                        }))
                      }
                      placeholder="Add comment if returning to engineer..."
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/manager/issues/${issue.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        type="button"
                        disabled={savingIssueId === issue.id}
                        onClick={() => handleReturnForRework(issue.id)}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                      >
                        Return
                      </button>
                      <button
                        type="button"
                        disabled={savingIssueId === issue.id}
                        onClick={() => handleCloseIssue(issue.id)}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Close
                      </button>
                    </div>
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
