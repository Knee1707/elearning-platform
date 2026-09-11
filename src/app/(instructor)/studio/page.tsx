import Link from "next/link";
import { getMyCourses } from "@/features/course/queries";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  published: "Đã publish",
  rejected: "Bị từ chối",
  hidden: "Đã ẩn",
};

export default async function StudioPage() {
  const courses = await getMyCourses();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Khóa học của tôi</h1>
        <Link href="/studio/new">
          <Button>+ Tạo khóa mới</Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bạn chưa có khóa học nào.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {courses.map((course) => (
            <li key={course.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{course.title}</p>
                <p className="text-sm text-muted-foreground">
                  {STATUS_LABEL[course.status] ?? course.status}
                </p>
              </div>
              <Link href={`/studio/${course.id}`} className="text-sm underline">
                Chỉnh sửa
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}