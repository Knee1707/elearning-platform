"use client";

import { useEffect } from "react";

export function LessonHighlightScroll({ targetId }: { targetId?: string }) {
  useEffect(() => {
    if (!targetId) return;

    // Đợi 200ms để DOM render hoàn chỉnh
    const timer = setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-amber-500", "ring-offset-2", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-amber-500", "ring-offset-2");
        }, 3500);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [targetId]);

  return null;
}
