import { useEffect, useMemo, useState } from "react";
import { getAllUsers } from "../../api/userApi";
import { showError } from "../../utils/toast";

const ROLE_FILTER_OPTIONS = [
  { value: "ALL", label: "All roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "ENGINEER", label: "Engineer" },
  { value: "USER", label: "User" }
];

function getApiMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.statusMessage ||
    err?.message ||
    "Something went wrong"
  );
}

export default function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("fullName");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getAllUsers();
        const data = res?.data ?? res;
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = getApiMessage(err);
        setError(msg);
        showError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const displayUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = users.filter((u) => {
      const matchesRole =
        roleFilter === "ALL" ? true : String(u?.role) === roleFilter;
      const matchesCompany =
        companyFilter === "ALL" ? true : u?.company === companyFilter;
      const hay = `${u?.fullName || ""} ${u?.email || ""} ${u?.company || ""}`.toLowerCase();
      const matchesSearch = q ? hay.includes(q) : true;
      return matchesRole && matchesCompany && matchesSearch;
    });

    const dir = sortDir === "desc" ? -1 : 1;
    const sorted = [...filtered].sort((a, b) => {
      const av = (a?.[sortBy] ?? "").toString();
      const bv = (b?.[sortBy] ?? "").toString();
      return dir * av.localeCompare(bv, undefined, { sensitivity: "base" });
    });

    return sorted;
  }, [users, search, roleFilter, companyFilter, sortBy, sortDir]);

  const toggleSort = (key) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  };

  const SortHeader = ({ label, sortKey }) => {
    const active = sortBy === sortKey;
    const dirArrow = !active ? "<>" : sortDir === "asc" ? "^" : "v";
    return (
      <button
        type="button"
        onClick={() => toggleSort(sortKey)}
        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-gray-100"
      >
        <span>{label}</span>
        <span className={`text-[10px] ${active ? "text-gray-900" : "text-gray-400"}`}>
          {dirArrow}
        </span>
      </button>
    );
  };

  const companies = useMemo(() => {
    const set = new Set(
      users
        .map((u) => u.company)
        .filter((c) => c && String(c).trim().length > 0)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and analyze users across all companies (read-only).
          </p>
        </div>
        <div className="text-sm text-gray-600">
          {displayUsers.length} user{displayUsers.length === 1 ? "" : "s"}
        </div>
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
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:w-56"
          >
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <SortHeader label="Name" sortKey="fullName" />
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <SortHeader label="Email" sortKey="email" />
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <SortHeader label="Role" sortKey="role" />
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <SortHeader label="Company" sortKey="company" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-gray-600">
                  Loading users...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-gray-700">
                  Failed to load users: {error}
                </td>
              </tr>
            ) : displayUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-600">
                  No users found.
                </td>
              </tr>
            ) : (
              displayUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {u.fullName || "-"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{u.email || "-"}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {String(u.role || "-")}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {u.company || "-"}
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
