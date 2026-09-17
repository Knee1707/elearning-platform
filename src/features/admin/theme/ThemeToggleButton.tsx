"use client";

import { Moon, Sun } from "lucide-react";
import { useAdminTheme } from "./AdminThemeProvider";

export function ThemeToggleButton() {
  const { theme, toggle } = useAdminTheme();

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