"use client";

import { Moon, Sun } from "lucide-react";
import { useAdminTheme } from "./AdminThemeProvider";

export function ThemeToggleButton({ variant = "sidebar" }: { variant?: "sidebar" | "icon" }) {
  const { theme, toggle } = useAdminTheme();

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Đổi giao diện sáng/tối"
        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-400" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
      aria-label="Đổi giao diện sáng/tối"
    >
      {theme === "light" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-amber-400" />}
      {theme === "light" ? "Chế độ tối" : "Chế độ sáng"}
    </button>
  );
}