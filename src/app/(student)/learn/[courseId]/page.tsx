// Route: /learn/[courseId] · Chủ: M3 · Màn HỌC (cần đã ghi danh).
// Điền: VideoPlayer + danh sách bài + % tiến độ + ghi chú + Q&A.
// Player báo % qua updateWatch (progress.ts/M2) → trigger tự điểm danh khi ≥95%.
export default function LearnPage({ params }: { params: { courseId: string } }) {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Học · khóa {params.courseId}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        TODO(M3): VideoPlayer + LessonList + markComplete + getCourseProgress + note + Q&A.
      </p>
    </main>
  );
}
