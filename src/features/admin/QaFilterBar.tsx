"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, RotateCcw } from "lucide-react";

interface QaFilterBarProps {
  initialKeyword?: string;
  hasActiveFilter?: boolean;
}

export function QaFilterBar({
  initialKeyword = "",
  hasActiveFilter = false,
}: QaFilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [keyword, setKeyword] = useState(initialKeyword);

  useEffect(() => {
    setKeyword(initialKeyword);
  }, [initialKeyword]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    startTransition(() => {
      if (trimmed) {
        router.push(`/admin/qa?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push("/admin/qa");
      }
    });
  };

  const handleClear = () => {
    setKeyword("");
    startTransition(() => {
      router.push("/admin/qa");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-center gap-2" role="search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          name="q"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm trong nội dung câu hỏi…"
          aria-label="Tìm câu hỏi"
          className="w-72 rounded border border-border bg-background py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Xóa từ khóa"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "Đang tìm..." : "Tìm"}
      </button>
      {(hasActiveFilter || keyword) && (
        <button
          type="button"
          onClick={handleClear}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Bỏ lọc
        </button>
      )}
    </form>
  );
}
