import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ThemeContext } from "./ThemeContext";
import { useAuth } from "./useAuth";

const THEME_KEY_PREFIX = "app_theme";
const LEGACY_THEME_KEY = "app_theme";

function getSystemTheme() {
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

function getSavedTheme(key) {
  const saved = localStorage.getItem(key);
  if (saved === "light" || saved === "dark") return saved;
  return null;
}

function getThemeStorageKey(user) {
  const userKey = user?.userId || user?.email || user?.sub || "guest";
  return `${THEME_KEY_PREFIX}:${String(userKey).toLowerCase()}`;
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const storageKey = useMemo(() => getThemeStorageKey(user), [user?.userId, user?.email, user?.sub]);
  const [theme, setTheme] = useState("light");

  const isAuthLightRoute =
    location.pathname === "/login" ||
    location.pathname === "/" ||
    location.pathname === "/maintenance" ||
    location.pathname === "/unauthorized" ||
    location.pathname === "/authentication/register" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";
  const isAppShellRoute = /^(\/superadmin|\/admin|\/manager|\/engineer|\/user|\/profile|\/force-change-password)(\/|$)/.test(
    location.pathname
  );

  useEffect(() => {
    const savedForUser = getSavedTheme(storageKey);
    if (savedForUser) {
      setTheme(savedForUser);
      return;
    }
    if (user) {
      // First login for this user: force light theme by default.
      setTheme("light");
      return;
    }
    const legacyTheme = getSavedTheme(LEGACY_THEME_KEY);
    setTheme(legacyTheme || getSystemTheme());
  }, [storageKey, user]);

  useEffect(() => {
    localStorage.setItem(storageKey, theme);
    localStorage.setItem(LEGACY_THEME_KEY, theme);
    const root = document.documentElement;
    const shouldUseDark = isAppShellRoute && !isAuthLightRoute && theme === "dark";
    root.classList.toggle("dark", shouldUseDark);
    root.setAttribute("data-theme", shouldUseDark ? "dark" : "light");
  }, [theme, isAuthLightRoute, storageKey]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark"))
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
