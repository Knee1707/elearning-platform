import type { Course } from "@/types/domain";
import { formatPrice } from "@/lib/utils";

// Chủ: M3 · Thẻ khóa học (dùng ở trang chủ, duyệt, tìm kiếm).
// Điền thêm: ảnh thumbnail, sao trung bình, badge "Nổi bật".
export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="rounded-lg border p-4">
      <h3 className="font-medium">{course.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{formatPrice(course.price)}</p>
      {/* TODO(M3): thumbnail + sao + link tới /courses/[slug] */}
    </article>
  );
}
