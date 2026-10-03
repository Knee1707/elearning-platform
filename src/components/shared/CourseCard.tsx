import Link from "next/link";
import { Star, Sparkles, BookOpen, GraduationCap } from "lucide-react";
import type { Course } from "@/types/domain";
import type { CourseCatalog } from "@/lib/queries/courses";
import { formatPrice } from "@/lib/utils";
import { QuickAddToCart } from "@/components/shared/QuickAddToCart";

// Chủ: M3 · Thẻ khóa học phong cách PrepEdu (dùng ở trang chủ, duyệt, tìm kiếm).
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
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-400/80 hover:shadow-xl">
      <Link href={`/courses/${course.slug}`} className="block flex-1">
        {/* THUMBNAIL CONTAINER */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="relative flex h-full w-full flex-col justify-between bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-800 p-4 text-white transition-transform duration-500 group-hover:scale-105">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-200">
                  E7 ACADEMY
                </span>
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white line-clamp-1">
                  {course.title}
                </span>
              </div>
            </div>
          )}

          {/* BADGES ON THUMBNAIL */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between">
            {course.isFeatured ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-950 shadow-sm">
                <Sparkles className="h-3 w-3" />
                <span>Nổi bật</span>
              </span>
            ) : (
              <span />
            )}

            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-slate-800 backdrop-blur-md shadow-xs">
              {displayLevel}
            </span>
          </div>
        </div>

        {/* CARD CONTENT */}
        <div className="p-5 space-y-3">
          {/* RATING & REVIEWS */}
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-black text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{avgRating > 0 ? avgRating.toFixed(1) : "5.0"}</span>
            </span>
            <span className="font-medium text-slate-400">
              {ratingCount > 0 ? `(${ratingCount} đánh giá)` : "(Mới cập nhật)"}
            </span>
          </div>

          {/* TIÊU ĐỀ KHÓA HỌC */}
          <h3 className="line-clamp-2 text-sm sm:text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600">
            {course.title}
          </h3>

          {/* MÔ TẢ NGẮN (NẾU CÓ) */}
          {course.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
              {course.description}
            </p>
          )}

          {/* GIẢNG VIÊN */}
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
              <GraduationCap className="h-3 w-3" />
            </div>
            <span className="truncate font-medium">{instructorName}</span>
          </div>
        </div>
      </Link>

      {/* PRICE & BUTTON FOOTER */}
      <div className="flex items-center justify-between border-t border-slate-100 p-4 pt-3 mt-auto">
        <div>
          {course.price > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-base font-black text-blue-600">
                {formatPrice(course.price)}
              </span>
            </div>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
              Miễn phí
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {course.price > 0 && (
            <QuickAddToCart
              courseId={course.id}
              courseTitle={course.title}
              price={course.price}
            />
          )}

          <Link
            href={`/courses/${course.slug}`}
            className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 shadow-xs"
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
