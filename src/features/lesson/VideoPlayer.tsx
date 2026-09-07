"use client";

import { useState } from "react";
import Link from "next/link";

// Chủ: M3 (L dựng khung bảo mật). Trình phát video CÓ GÁC QUYỀN.
// Bấm "Xem bài" → gọi /api/lesson-video/[id] (URL lấy qua fn_get_lesson_video):
//   - có url  → phát video;
//   - null    → bài trả phí + chưa ghi danh → hiện nút "Mua để xem".
// TODO(M3): thêm tua/tốc độ, báo % đã xem (updateWatch) khi làm player đầy đủ.
type PlayerState = "idle" | "loading" | "ready" | "locked";

export function VideoPlayer({ lessonId, isFree }: { lessonId: string; isFree?: boolean }) {
  const [state, setState] = useState<PlayerState>("idle");
  const [url, setUrl] = useState<string | null>(null);

  async function load() {
    setState("loading");
    try {
      const res = await fetch(`/api/lesson-video/${lessonId}`);
      const data = (await res.json()) as { url: string | null };
      if (data.url) {
        setUrl(data.url);
        setState("ready");
      } else {
        setState("locked");
      }
    } catch {
      setState("locked");
    }
  }

  if (state === "ready" && url) {
    return <video controls src={url} className="w-full rounded-lg" />;
  }

  if (state === "locked") {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm">
        <p className="mb-2 text-muted-foreground">Bài này cần mua khóa để xem.</p>
        <Link href="/cart" className="font-medium text-primary underline">
          Mua để xem →
        </Link>
      </div>
    );
  }

  return (
    <button
      onClick={load}
      disabled={state === "loading"}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
    >
      {state === "loading" ? "Đang tải…" : isFree ? "Xem thử" : "Xem bài"}
    </button>
  );
}
