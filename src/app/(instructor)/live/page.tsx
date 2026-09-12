import { getMyCourses } from "@/features/course/queries";
import { LiveManager } from "@/features/live/manage/LiveManager";

export default async function LiveManagePage() {
  const courses = await getMyCourses();
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Buổi học trực tiếp</h1>
      <p className="mt-2 text-sm text-muted-foreground">Tạo lịch học và theo dõi điểm danh cho từng khóa của bạn.</p>
      <div className="mt-6 space-y-6">{courses.length ? courses.map((course) => <section key={course.id} className="space-y-3"><h2 className="text-lg font-semibold">{course.title}</h2><LiveManager courseId={course.id} /></section>) : <p className="text-sm text-muted-foreground">Bạn chưa có khóa học để tạo buổi trực tiếp.</p>}</div>
    </main>
  );
}
