import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Tag,
  UserRound
} from "lucide-react";
import {
  addIssueComment,
  getIssueAttachmentDownloadUrl,
  getIssueAttachments,
  getIssueById,
  getIssueComments,
  getIssueSlaStatus,
  getIssueTimeline,
  updateIssueStatus
} from "../../api/issuesApi";
import { useAuth } from "../../context/useAuth";
import { showError, showSuccess } from "../../utils/toast";

const TABS = ["Overview", "Activity History", "SLA Details", "Attachments", "Comments"];

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

function unwrapArrayData(res) {
  const data = unwrapData(res);
  return Array.isArray(data) ? data : [];
}

function formatStatus(value) {
  return String(value || "-")
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function formatDateTime(value) {
  if (!value) return "-";
  const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
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

function formatMinutesAsHours(min) {
  const value = Number(min);
  if (!Number.isFinite(value)) return "-";
  if (value <= 0) return "0m";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function issueCode(id) {
  const num = Number(id);
  if (Number.isNaN(num)) return "-";
  return `ISS-${String(num).padStart(3, "0")}`;
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value || "-"}</p>
    </div>
  );
}

function badgeClassByStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CREATED") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (normalized === "OPEN") return "bg-blue-50 text-blue-700 border-blue-200";
  if (normalized === "IN_PROGRESS") return "bg-amber-50 text-amber-700 border-amber-200";
  if (normalized === "RESOLVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized === "CLOSED") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function badgeClassBySeverity(severity) {
  const normalized = String(severity || "").toUpperCase();
  if (normalized === "CRITICAL") return "bg-red-100 text-red-700";
  if (normalized === "HIGH") return "bg-orange-100 text-orange-700";
  if (normalized === "MEDIUM") return "bg-yellow-100 text-yellow-700";
  if (normalized === "LOW") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

export default function UserIssueDetails() {
  const { issueId } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [issue, setIssue] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [sla, setSla] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const role = String(user?.role || "").toUpperCase();

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [issueRes, slaRes, timelineRes, attachmentRes, commentsRes] = await Promise.all([
        getIssueById(issueId),
        getIssueSlaStatus(issueId),
        getIssueTimeline(issueId),
        getIssueAttachments(issueId),
        getIssueComments(issueId)
      ]);
      setIssue(unwrapData(issueRes));
      setSla(unwrapData(slaRes));
      setTimeline(unwrapArrayData(timelineRes));
      setAttachments(unwrapArrayData(attachmentRes));
      setComments(unwrapArrayData(commentsRes));
    } catch (err) {
      const msg = getApiMessage(err);
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [issueId]);

  const slaRemainingText = useMemo(() => formatMinutesAsHours(sla?.remainingMinutes), [sla]);
  const slaNotStarted = String(sla?.status || "").toUpperCase() === "NOT_STARTED";
  const responseTimeText = useMemo(() => {
    if (!sla?.slaStartTime || !sla?.slaDueTime) return "-";
    const start = new Date(String(sla.slaStartTime).replace(" ", "T")).getTime();
    const due = new Date(String(sla.slaDueTime).replace(" ", "T")).getTime();
    const mins = Math.max(0, Math.round((due - start) / 60000));
    return formatMinutesAsHours(mins);
  }, [sla]);

  const refreshComments = async () => {
    try {
      const commentsRes = await getIssueComments(issueId);
      setComments(unwrapArrayData(commentsRes));
    } catch (err) {
      showError(getApiMessage(err));
    }
  };

  const handleAddComment = async () => {
    const text = String(commentText || "").trim();
    if (!text) {
      showError("Comment cannot be empty");
      return;
    }
    try {
      setCommentSaving(true);
      await addIssueComment(issueId, text);
      setCommentText("");
      await refreshComments();
      showSuccess("Comment added");
    } catch (err) {
      showError(getApiMessage(err));
    } finally {
      setCommentSaving(false);
    }
  };

  const handleManagerStatusUpdate = async (nextStatus) => {
    try {
      setStatusSaving(true);
      await updateIssueStatus(issueId, nextStatus);
      setIssue((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      showSuccess(`Issue moved to ${formatStatus(nextStatus)}`);
    } catch (err) {
      showError(getApiMessage(err));
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading issue details...</div>;
  }

  if (error || !issue) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Failed to load issue details: {error || "Issue not found"}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{issueCode(issue.id)}</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClassByStatus(issue.status)}`}>
                {formatStatus(issue.status)}
              </span>
              <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${badgeClassBySeverity(issue.severity)}`}>
                {issue.severity || "-"}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{issue.title || "-"}</h1>
            <div className="flex flex-wrap items-center gap-5 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4" />
                {issue.createdByName || issue.createdBy || "Reporter"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDateTime(issue.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Tag className="h-4 w-4" />
                {issue.projectName || "-"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {role === "MANAGER" && String(issue?.status || "").toUpperCase() === "RESOLVED" && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-amber-900">Manager Review Required</h2>
              <p className="mt-1 text-sm text-amber-800">
                Close the issue if verified, or add feedback in Comments tab and return it to engineer.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => handleManagerStatusUpdate("OPEN")}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              >
                Return To Engineer
              </button>
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => handleManagerStatusUpdate("CLOSED")}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              >
                Close Issue
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === tab
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="xl:col-span-2 min-h-[240px] rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-3xl font-semibold text-gray-900">Description</h2>
            <p className="mt-4 text-base leading-relaxed text-gray-700">{issue.description || "-"}</p>
          </section>
          <section className="space-y-4">
            <div className="min-h-[120px] rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-base font-semibold text-gray-700">SLA Timer</h3>
                <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                {slaNotStarted ? "Not started" : slaRemainingText}
              </p>
              {slaNotStarted && (
                <p className="mt-1 text-xs text-gray-500">Timer starts when engineer clicks Start (In Progress).</p>
              )}
            </div>
            <InfoCard
              label="Assigned To"
              value={
                issue.assignedEngineerName ||
                issue.assignedToName ||
                issue.assignedTo ||
                "-"
              }
            />
            <InfoCard label="Severity" value={issue.severity || "-"} />
            <InfoCard label="Project" value={issue.projectName || "-"} />
            <InfoCard label="Last Updated" value={formatDateTime(issue.createdAt)} />
          </section>
        </div>
      )}

      {activeTab === "Activity History" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-3xl font-semibold text-gray-900">Activity Timeline</h2>
          <div className="mt-5 space-y-4">
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-600">No activity found.</p>
            ) : (
              timeline.map((item, idx) => {
                const name = item?.performedBy || "System";
                const initial = String(name).trim().charAt(0).toUpperCase() || "S";
                return (
                  <div key={`${item?.createdAt}-${idx}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
                        {initial}
                      </div>
                      {idx !== timeline.length - 1 && <div className="h-full w-px bg-gray-300" />}
                    </div>
                    <article className="flex-1 rounded-xl bg-gray-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base font-semibold text-gray-900">{name}</p>
                        <p className="text-sm text-gray-500">{formatDateTime(item?.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{item?.description || item?.action || "-"}</p>
                    </article>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {activeTab === "SLA Details" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-3xl font-semibold text-gray-900">SLA Details</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-h-[112px] rounded-xl bg-gray-50 p-4">
              <p className="inline-flex items-center gap-2 text-gray-600">
                <Clock3 className="h-4 w-4" /> Response Time
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{responseTimeText}</p>
            </div>
            <div className="min-h-[112px] rounded-xl bg-gray-50 p-4">
              <p className="inline-flex items-center gap-2 text-gray-600">
                <Clock3 className="h-4 w-4" /> Resolution Time
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{responseTimeText}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <p className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Current SLA Status
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              {slaNotStarted ? "Not started" : `${slaRemainingText} (${formatStatus(sla?.status)})`}
            </p>
          </div>
        </section>
      )}

      {activeTab === "Attachments" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-3xl font-semibold text-gray-900">Attachments</h2>
          {attachments.length === 0 ? (
            <div className="mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
              <FileText className="h-14 w-14" />
              <p className="mt-3 text-sm">No attachments</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      File
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Uploaded By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Uploaded At
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {attachments.map((file) => (
                    <tr key={file.id}>
                      <td className="px-4 py-3 text-sm text-gray-800">{file.fileName || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{file.uploadedBy || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(file.uploadedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={getIssueAttachmentDownloadUrl(file.downloadUrl || "")}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "Comments" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-3xl font-semibold text-gray-900">Comments</h2>
          <div className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-600">No comments yet.</p>
            ) : (
              comments.map((item) => (
                <article key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{item.commentedBy || "Unknown"}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{item.comment || "-"}</p>
                </article>
              ))
            )}
          </div>
          <div className="mt-5 rounded-xl border border-gray-200 p-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Add Comment</label>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write update or feedback..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={commentSaving}
                onClick={handleAddComment}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {commentSaving ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
