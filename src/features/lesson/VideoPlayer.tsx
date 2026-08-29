"use client";

// Chủ: M3 · Trình phát video.
// Điền: <video> + tua/tốc độ; định kỳ gọi updateWatch(lessonId, percent) (progress.ts/M2)
//        và savePosition(lessonId, seconds). Khi %≥95 → trigger M2 tự điểm danh.
export function VideoPlayer({ lessonId, src }: { lessonId: string; src: string }) {
  // TODO(M3): quản lý currentTime/duration, gửi % về DB (throttle).
  return (
    <div>
      <video controls src={src} className="w-full rounded-lg" />
      {/* lessonId={lessonId} dùng để báo tiến độ */}
    </div>
  );
}
