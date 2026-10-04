import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { CourseForm } from "@/features/course/CourseForm";

// Quản trị (admin + super admin) tạo khóa học mới.
// Khóa học được tự động thêm & xuất bản trực tiếp mà không cần gửi duyệt.
// Hỗ trợ phân công 1 hoặc nhiều giảng viên cùng giảng dạy.
export default async function AdminNewCoursePage() {
  await requireRole(ADMIN_ROLES);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/admin/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách khóa học
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Thêm khóa học mới</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Khóa học tạo bởi Quản trị viên sẽ được <b>tự động thêm và xuất bản ngay vào hệ thống</b> (không cần qua bước gửi duyệt). Bạn có thể chỉ định 1 hoặc nhiều giảng viên phụ trách khóa học này.
      </p>
      <CourseForm area="admin" />
    </main>
  );
}

