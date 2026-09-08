import Link from "next/link";
import { Star, User, Sparkles, BookOpen } from "lucide-react";
import type { Course } from "@/types/domain";
import type { CourseCatalog } from "@/lib/queries/courses";
import { formatPrice } from "@/lib/utils";

// Chủ: M3 · Thẻ khóa học (dùng ở trang chủ, duyệt, tìm kiếm).
interface CourseCardProps {
  course: Course | CourseCatalog;
}

export function CourseCard({ course }: CourseCardProps) {
  const catalogItem = course as Partial<CourseCatalog>;
  const instructorName = catalogItem.instructorName || "Giảng viên LMS";
  const avgRating = catalogItem.avgRating ?? 5.0;
  const ratingCount = catalogItem.ratingCount ?? 0;

  const levelMap: Record<string, string> = {
    beginner: "Cơ bản",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
    all: "Mọi cấp độ",
  };
  const displayLevel = levelMap[course.level?.toLowerCase()] || course.level || "Cơ bản";

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
    >
      {/* THUMBNAIL CONTAINER */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-accent/20 text-muted-foreground transition-transform duration-300 group-hover:scale-105">
            <BookOpen className="h-10 w-10 opacity-40 text-primary" />
          </div>
        )}

        {/* BADGES ON THUMBNAIL */}
        <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between pointer-events-none">
          {course.isFeatured ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              <Sparkles className="h-3 w-3" />
              <span>Nổi bật</span>
            </span>
          ) : (
            <span />
          )}

          <span className="rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm shadow-xs">
            {displayLevel}
          </span>
        </div>
      </div>

      {/* CARD CONTENT */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-2">
          {/* TIÊU ĐỀ KHÓA HỌC */}
          <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {course.title}
          </h3>

          {/* TÊN GIẢNG VIÊN */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span className="truncate">{instructorName}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
          {/* SAO ĐÁNH GIÁ */}
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">
              {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
            </span>
            <span className="text-muted-foreground text-[11px]">
              {ratingCount > 0 ? `(${ratingCount})` : "(Mới)"}
            </span>
          </div>

          {/* GIÁ TIỀN */}
          <div className="text-right">
            {course.price > 0 ? (
              <span className="text-sm font-bold text-foreground">
                {formatPrice(course.price)}
              </span>
            ) : (
              <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Miễn phí
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
