import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { CourseForm } from "@/features/course/CourseForm";

// Quản trị (admin + super admin) tạo khóa học mới. Khóa được tạo ở trạng thái
// nháp, người tạo là người phụ trách — sau đó thêm chương/bài ở trang chỉnh sửa.
export default async function AdminNewCoursePage() {
  await requireRole(ADMIN_ROLES);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/admin/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách khóa học
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Thêm khóa học</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Khóa được tạo ở trạng thái <b>nháp</b>; bạn là người phụ trách. Sau khi tạo, thêm chương/bài rồi xuất bản ở trang chỉnh sửa.
      </p>
      <CourseForm area="admin" />
    </main>
  );
}
