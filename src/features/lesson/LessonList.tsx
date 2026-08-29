// Chủ: M3 · Danh sách chương → bài (mục lục khi học).
// Điền: render chương/bài, đánh dấu bài đã xong, nút markComplete (progress.ts/M2).
export function LessonList({ courseId }: { courseId: string }) {
  // TODO(M3): lấy mục lục từ getCourseDetail; hiển thị is_completed.
  return <aside className="text-sm">{/* mục lục khóa {courseId} */}</aside>;
}
