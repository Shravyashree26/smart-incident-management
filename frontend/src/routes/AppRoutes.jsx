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
import EngineerProjectDetails from "../pages/engineer/EngineerProjectDetails";
import UserDashboard from "../pages/user/UserDashboard";
import PlaceholderPage from "../pages/common/PlaceholderPage";
import AdminUserManagement from "../pages/admin/AdminUserManagement";
import AdminProjects from "../pages/admin/AdminProjects";
import AdminSlaConfiguration from "../pages/admin/AdminSlaConfiguration";
import AdminSlaMonitoring from "../pages/admin/AdminSlaMonitoring";
import AdminReports from "../pages/admin/AdminReports";
import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import SuperAdminAddCompanyAdmin from "../pages/superadmin/SuperAdminAddCompanyAdmin";
import SuperAdminUsers from "../pages/superadmin/SuperAdminUsers";
import SuperAdminLogs from "../pages/superadmin/SuperAdminLogs";
import EditProfile from "../pages/profile/EditProfile";
import ChangePassword from "../pages/profile/ChangePassword";
import UserProjectDetails from "../pages/user/UserProjectDetails";
import UserCreateIssue from "../pages/user/UserCreateIssue";
import UserIssues from "../pages/user/UserIssues";
import UserReports from "../pages/user/UserReports";
import UserIssueDetails from "../pages/user/UserIssueDetails";
import ManagerAssignedProjects from "../pages/manager/ManagerAssignedProjects";
import ManagerIssues from "../pages/manager/ManagerIssues";
import Team from "../pages/manager/Team";
import AssignIssues from "../pages/manager/AssignIssues";
import ManagerSlaMonitoring from "../pages/manager/ManagerSlaMonitoring";
import ManagerWorkload from "../pages/manager/ManagerWorkload";
import ManagerReports from "../pages/manager/ManagerReports";
import ManagerResolvedIssues from "../pages/manager/ManagerResolvedIssues";
import MyIssues from "../pages/engineer/MyIssues";

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
              <AdminSlaMonitoring />
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
              <AdminReports />
            </ProtectedRoute>
          }
        />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route
          path="/manager/projects"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerAssignedProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/projects/:projectId"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerAssignedProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/issues"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerIssues />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/issues/:issueId"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <UserIssueDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/assign-issues"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <AssignIssues />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/sla-monitoring"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerSlaMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/workload"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerWorkload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/team-users"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <Team />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/resolved-issues"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ManagerResolvedIssues />
            </ProtectedRoute>
          }
        />
        <Route path="/engineer/dashboard" element={<EngineerDashboard />} />
        <Route
          path="/engineer/project"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <EngineerProjectDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/project/:projectId"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <EngineerProjectDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/issues"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <MyIssues />
            </ProtectedRoute>
          }
        />
        <Route
          path="/engineer/issues/:issueId"
          element={
            <ProtectedRoute allowedRoles={["ENGINEER"]}>
              <UserIssueDetails />
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
              <UserProjectDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/project/:projectId"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <UserProjectDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/create-issue"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <UserCreateIssue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/issues"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <UserIssues />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/issues/:issueId"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <UserIssueDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/reports"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <UserReports />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

















