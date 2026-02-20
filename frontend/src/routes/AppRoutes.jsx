import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Index from "../pages/public/Index";
import ForgotPassword from "../pages/auth/ForgotPassword";
import AuthLayout from "../layouts/AuthLayout";
import ForceChangePassword from "../pages/auth/ForceChangePassword";


import Unauthorized from "../pages/errors/Unauthorized";
import NotFound from "../pages/errors/NotFound";
import Maintenance from "../pages/errors/Maintenance";

import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";

import AdminDashboard from "../pages/admin/AdminDashboard";
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import EngineerDashboard from "../pages/engineer/EngineerDashboard";
import UserDashboard from "../pages/user/UserDashboard";
import PlaceholderPage from "../pages/common/PlaceholderPage";
import AdminUserManagement from "../pages/admin/AdminUserManagement";
import AdminProjects from "../pages/admin/AdminProjects";
import AdminSlaConfiguration from "../pages/admin/AdminSlaConfiguration";
import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import SuperAdminAddCompanyAdmin from "../pages/superadmin/SuperAdminAddCompanyAdmin";
import SuperAdminUsers from "../pages/superadmin/SuperAdminUsers";
import SuperAdminLogs from "../pages/superadmin/SuperAdminLogs";
import EditProfile from "../pages/profile/EditProfile";
import ChangePassword from "../pages/profile/ChangePassword";

export default function AppRoutes() {
  return (
    <Routes>

      <Route path="/" element={
          <PublicRoute>
            <Index />
          </PublicRoute>
        }
      />

      <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route path="/authentication/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/maintenance" element={<Maintenance />} />


      {/* ALL AUTHENTICATED PAGES */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER", "ENGINEER", "USER"]}
          >
            <AuthLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/superadmin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/add-company-admin"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminAddCompanyAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/users"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/logs"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <SuperAdminLogs />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/profile/change-password" element={<ChangePassword />} />
        <Route
          path="/force-change-password"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER", "ENGINEER", "USER"]}>
              <ForceChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
              <AdminProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/add-member"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
              <PlaceholderPage title="Admin · Add Member" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sla-monitoring"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
              <PlaceholderPage title="Admin · SLA Monitoring" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sla-config"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
              <AdminSlaConfiguration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
              <AdminUserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
              <PlaceholderPage title="Admin · Reports" />
            </ProtectedRoute>
          }
        />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route
          path="/manager/projects"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <PlaceholderPage title="Manager · Assigned Projects" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/issues"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <PlaceholderPage title="Manager · Issues" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/assign-issues"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <PlaceholderPage title="Manager · Assign Issues" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/sla-monitoring"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <PlaceholderPage title="Manager · SLA Monitoring" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/workload"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <PlaceholderPage title="Manager · Workload" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/team-users"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <PlaceholderPage title="Manager · Team Users" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <PlaceholderPage title="Manager · Reports" />
            </ProtectedRoute>
          }
        />
        <Route path="/engineer/dashboard" element={<EngineerDashboard />} />
        <Route
          path="/engineer/project"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <PlaceholderPage title="Engineer · Project Details" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/issues"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <PlaceholderPage title="Engineer · Assigned Issues" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/sla-policies"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <PlaceholderPage title="Engineer · SLA Policies" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/workload"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <PlaceholderPage title="Engineer · My Workload" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/issue-status"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <PlaceholderPage title="Engineer · Issue Status" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/solved-issues"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <PlaceholderPage title="Engineer · Solved Issues" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/reports"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <PlaceholderPage title="Engineer · Reports" />
            </ProtectedRoute>
          }
        />
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route
          path="/user/project"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <PlaceholderPage title="User · Project Details" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/create-issue"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <PlaceholderPage title="User · Create Issue" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/issues"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <PlaceholderPage title="User · My Issues" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/reports"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <PlaceholderPage title="User · Reports" />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


