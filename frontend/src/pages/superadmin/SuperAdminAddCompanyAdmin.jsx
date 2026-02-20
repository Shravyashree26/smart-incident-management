import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  SquarePen,
  X
} from "lucide-react";
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser
} from "../../api/userApi";
import { showError, showSuccess } from "../../utils/toast";
import LoadingButton from "../../components/common/LoadingButton";

function getApiMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.statusMessage ||
    err?.message ||
    "Something went wrong"
  );
}

function generateStrongPassword(length = 12) {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*_-+";
  const all = lower + upper + digits + symbols;

  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];

  let pwd = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  for (let i = pwd.length; i < length; i++) pwd.push(pick(all));

  for (let i = pwd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }
  return pwd.join("");
}

function Modal({ title, open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  whatHappens,
  user,
  confirmMessage,
  confirmText = "Yes",
  tone = "danger",
  icon,
  loading,
  onCancel,
  onConfirm
}) {
  if (!open) return null;

  const isDanger = tone === "danger";
  const Icon = icon || AlertTriangle;
  const iconWrap = isDanger
    ? "bg-red-50 text-red-600 border-red-100"
    : "bg-indigo-50 text-indigo-600 border-indigo-100";
  const confirmBtn = isDanger
    ? "bg-red-600 hover:bg-red-700"
    : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="px-6 pt-6 text-center">
          <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${iconWrap}`}>
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-gray-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{confirmMessage}</p>
        </div>

        <div className="px-6 pb-2 pt-4">
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-left">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">User:</span>{" "}
              {user?.fullName || "-"}{" "}
              <span className="text-gray-500">({user?.email || "-"})</span>
            </p>
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Action:</span>{" "}
              {whatHappens}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${confirmBtn}`}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminAddCompanyAdmin() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const confirmActionRef = useRef(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    whatHappens: "",
    confirmMessage: "",
    confirmText: "Confirm",
    tone: "danger",
    icon: null,
    user: null
  });

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasPwInput = (form.password || "").length > 0 || (form.confirmPassword || "").length > 0;
  const pwMatches = (form.password || "").length > 0 && form.password === form.confirmPassword;
  const pwMismatch = hasPwInput && form.password !== form.confirmPassword;

  const passwordFieldClasses = pwMatches
    ? "border-green-500 focus:ring-2 focus:ring-green-500"
    : pwMismatch
      ? "border-red-500 focus:ring-2 focus:ring-red-500"
      : "border-gray-300 focus:ring-2 focus:ring-indigo-500";

  const normalizeCompany = (value) => String(value || "").trim().toLowerCase();

  const companies = useMemo(() => {
    const set = new Set(
      admins
        .map((a) => a.company)
        .filter((c) => c && String(c).trim().length > 0)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [admins]);

  // Check if selected company already has another admin (excluding self during edit)
  const selectedCompanyHasAdmin = useMemo(() => {
    if (!form.company.trim()) return false;
    const target = normalizeCompany(form.company);
    return admins.some((admin) => {
      if (editing && admin.id === editing.id) return false;
      return normalizeCompany(admin.company) === target;
    });
  }, [form.company, admins, editing]);

  const companyFieldClasses = selectedCompanyHasAdmin
    ? "w-full rounded-xl border border-red-500 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
    : "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  const displayAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return admins.filter((a) => {
      const matchesCompany =
        companyFilter === "ALL" ? true : a.company === companyFilter;
      const hay = `${a.fullName || ""} ${a.email || ""} ${a.company || ""}`.toLowerCase();
      const matchesSearch = q ? hay.includes(q) : true;
      return matchesCompany && matchesSearch;
    });
  }, [admins, search, companyFilter]);

  const fetchAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllUsers();
      const data = res?.data ?? res;
      const all = Array.isArray(data) ? data : [];
      setAdmins(all.filter((u) => String(u.role) === "ADMIN"));
    } catch (err) {
      const msg = getApiMessage(err);
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      company: ""
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalOpen(true);
  };

  const openEdit = (admin) => {
    setEditing(admin);
    setForm({
      fullName: admin?.fullName || "",
      email: admin?.email || "",
      password: "",
      confirmPassword: "",
      company: admin?.company || ""
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalOpen(true);
  };

  const openConfirm = (config, action) => {
    confirmActionRef.current = action;
    setConfirmConfig(config);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirmOpen(false);
    confirmActionRef.current = null;
  };

  const handleConfirm = async () => {
    if (!confirmActionRef.current) return;
    setConfirmLoading(true);
    try {
      await confirmActionRef.current();
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      confirmActionRef.current = null;
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.fullName.trim()) {
      showError("Full name is required");
      return;
    }

    if (!form.email.trim()) {
      showError("Email is required");
      return;
    }

    if (!form.company.trim()) {
      showError("Company is required");
      return;
    }

    const companyHasAdmin = admins.some((admin) => {
      if (editing && admin.id === editing.id) return false;
      return normalizeCompany(admin.company) === normalizeCompany(form.company);
    });
    if (companyHasAdmin) {
      showError(`Company "${form.company.trim()}" already has an admin. Only 1 admin per company is allowed.`);
      return;
    }

    if (!editing) {
      if ((form.password || "").length < 6) {
        showError("Password must be at least 6 characters");
        return;
      }
      if (form.password !== form.confirmPassword) {
        showError("Passwords do not match");
        return;
      }
    }

    const doSave = async () => {
      setSaving(true);
      try {
        if (editing) {
          await updateUser(editing.id, {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            company: form.company.trim()
          });
          showSuccess("Company admin updated");
        } else {
          await createUser({
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            password: form.password,
            role: "ADMIN",
            company: form.company.trim()
          });
          showSuccess("Company admin created successfully");
        }

        setModalOpen(false);
        await fetchAdmins();
      } catch (err) {
        showError(getApiMessage(err));
      } finally {
        setSaving(false);
      }
    };
    await doSave();
  };

  const handleDelete = async (admin) => {
    try {
      await deleteUser(admin.id);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      showSuccess("Company admin deleted");
    } catch (err) {
      showError(getApiMessage(err));
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Company Admins
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Add and manage company-level admins. Each company admin manages projects and users within their own company.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add Company Admin
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or company..."
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:max-w-md"
          />
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:w-56"
          >
            <option value="ALL">All companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-600">
          {displayAdmins.length} admin{displayAdmins.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Company
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-600" colSpan={4}>
                  Loading company admins...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-700" colSpan={4}>
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="font-semibold">Failed to load:</span>{" "}
                      {error}
                    </div>
                    <div>
                      <button
                        onClick={fetchAdmins}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : displayAdmins.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-gray-600" colSpan={4}>
                  No company admins found.
                </td>
              </tr>
            ) : (
              displayAdmins.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {a.fullName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {a.email || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {a.company || "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        title="Edit company admin"
                      >
                        <SquarePen className="h-5 w-5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() =>
                          openConfirm(
                            {
                              title: "Delete company admin?",
                              whatHappens:
                                "This will permanently delete the company admin account. This action cannot be undone.",
                              confirmMessage: "Are you sure you want to delete this company admin?",
                              confirmText: "Delete",
                              tone: "danger",
                              icon: Trash2,
                              user: a
                            },
                            async () => {
                              await handleDelete(a);
                            }
                          )
                        }
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        title="Delete company admin"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        whatHappens={confirmConfig.whatHappens}
        confirmMessage={confirmConfig.confirmMessage}
        confirmText={confirmConfig.confirmText}
        tone={confirmConfig.tone}
        icon={confirmConfig.icon}
        user={confirmConfig.user}
        loading={confirmLoading}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit company admin" : "Add company admin"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Full name
              </label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Jane Doe"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                readOnly={Boolean(editing)}
                autoComplete="off"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                  editing
                    ? "border-gray-200 bg-gray-100 text-gray-600"
                    : "border-gray-300 focus:ring-2 focus:ring-indigo-500"
                }`}
                placeholder="e.g. jane@company.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Company
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                readOnly={Boolean(editing)}
                autoComplete="off"
                className={
                  editing
                    ? "w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 outline-none"
                    : companyFieldClasses
                }
                placeholder="e.g. Acme Corp"
              />
              {selectedCompanyHasAdmin && (
                <p className="mt-1 text-xs font-medium text-red-700">
                  This company already has an admin registered for this company.
                </p>
              )}
            </div>

            {!editing && (
              <>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-600">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = generateStrongPassword(12);
                        setForm((p) => ({
                          ...p,
                          password: pwd,
                          confirmPassword: pwd
                        }));
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className={`w-full rounded-xl border px-3 py-2 pr-11 text-sm outline-none ${passwordFieldClasses}`}
                      placeholder="Minimum 6 characters"
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
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, confirmPassword: e.target.value }))
                      }
                      className={`w-full rounded-xl border px-3 py-2 pr-11 text-sm outline-none ${passwordFieldClasses}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-indigo-600"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
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
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || selectedCompanyHasAdmin}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              title={selectedCompanyHasAdmin ? "Company already has an admin" : ""}
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Create company admin"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
