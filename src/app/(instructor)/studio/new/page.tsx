import { CourseForm } from "@/features/course/CourseForm";

export default function NewCoursePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Tạo khóa học</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Khóa sẽ được tạo ở trạng thái nháp — bạn có thể thêm chương/bài và gửi duyệt sau.
      </p>
      <CourseForm />
    </main>
  );
}