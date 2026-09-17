"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const AdminThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

const STORAGE_KEY = "admin-theme"; // riêng cho khu Admin, không đụng theme của toàn site.

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return (
    <AdminThemeContext.Provider value={{ theme, toggle }}>
      {/* Class "dark" chỉ bọc trong div này — CSS variables trong globals.css
          cascade theo class .dark trên BẤT KỲ phần tử nào, không riêng <html>,
          nên phần còn lại của site (Auth, Studio, trang chủ M3...) không bị ảnh hưởng. */}
      <div className={theme === "dark" ? "dark" : ""}>{children}</div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme phải dùng bên trong AdminThemeProvider");
  return ctx;
}