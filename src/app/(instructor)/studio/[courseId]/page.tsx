// Route: /studio/[courseId] · Chủ: M4 · Sửa khóa: chương/bài, kéo-thả, upload, publish.
// Điền: CourseForm + quản lý chương/bài (@dnd-kit) + soạn quiz (features/quiz/author) + gửi duyệt.
export default function EditCoursePage({ params }: { params: { courseId: string } }) {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Sửa khóa: {params.courseId}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        TODO(M4): CRUD chương/bài + kéo-thả + upload video/PDF + Publish (draft→pending).
      </p>
    </main>
  );
}
