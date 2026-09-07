import { getCourseDetail } from "@/lib/queries/courses";
import { VideoPlayer } from "@/features/lesson/VideoPlayer";

// Route: /learn/[courseId] · Chủ: M3 (L dựng khung gác quyền video).
// Ghi chú: [courseId] dùng như SLUG khóa (getCourseDetail nhận slug).
// Mỗi bài có VideoPlayer tự kiểm quyền: học thử / đã mua → xem; trả phí chưa mua → "Mua để xem".
export default async function LearnPage({ params }: { params: { courseId: string } }) {
  let course = null;
  try {
    course = await getCourseDetail(params.courseId);
  } catch {
    course = null;
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold">Không tìm thấy khóa học</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kiểm tra lại đường dẫn (slug khóa) hoặc khóa chưa được xuất bản.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">{course.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Giảng viên: {course.instructorName}</p>

      <div className="mt-6 space-y-6">
        {course.chapters.map((chapter) => (
          <section key={chapter.id}>
            <h2 className="font-semibold">{chapter.title}</h2>
            <ul className="mt-2 space-y-3">
              {chapter.lessons.map((lesson) => (
                <li key={lesson.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <span className="font-medium">{lesson.title}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {lesson.isFree ? "Học thử" : "Trả phí"}
                    </span>
                  </div>
                  <VideoPlayer lessonId={lesson.id} isFree={lesson.isFree} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
