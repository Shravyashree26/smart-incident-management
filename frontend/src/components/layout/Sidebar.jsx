import { NavLink } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { SIDEBAR_CONFIG } from "../../config/sidebarConfig";
import { useAuth } from "../../context/useAuth";
import { normalizeRole } from "../../utils/roleRouting";

const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = SIDEBAR_CONFIG[normalizeRole(user?.role)] || [];

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 bg-slate-900 text-slate-100 transition-all duration-300
        ${collapsed ? "w-16" : "w-64"}
      `}
    >
      {/* TOP */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <span className="text-lg font-semibold tracking-wide">
            ServicePulse
          </span>
        )}
        <button onClick={() => setCollapsed(!collapsed)}>
          <ChevronLeft
            className={`w-5 h-5 transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* MENU */}
      <nav className="mt-4 space-y-1 px-0 overflow-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 text-sm
                hover:bg-slate-800 transition
                ${isActive ? "bg-slate-800 border-l-4 border-indigo-500" : ""}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
