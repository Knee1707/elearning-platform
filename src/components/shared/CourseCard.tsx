"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Star, BookOpen, GraduationCap, Sparkles } from "lucide-react";
import type { Course } from "@/types/domain";
import type { CourseCatalog } from "@/lib/queries/courses";

// Thẻ khóa học hỗ trợ 2 kiểu hiển thị:
// 1. "horizontal" (Mặc định): Dạng card ngang theo danh mục Coursera (ảnh vuông bên trái, giảng viên/tiêu đề/sao bên phải)
// 2. "vertical": Dạng card đứng truyền thống (ảnh 16/9 bên trên)
interface CourseCardProps {
  course: Course | CourseCatalog;
  className?: string;
  variant?: "horizontal" | "vertical";
}

const FALLBACK_GRADIENTS = [
  "from-blue-700 via-blue-600 to-indigo-800",
  "from-indigo-700 via-purple-600 to-violet-800",
  "from-slate-800 via-slate-700 to-zinc-900",
  "from-sky-700 via-blue-600 to-cyan-800",
  "from-emerald-700 via-teal-600 to-cyan-800",
];

export function CourseCard({
  course,
  className = "",
  variant = "horizontal",
}: CourseCardProps) {
  const [imageError, setImageError] = useState(false);
  const catalogItem = course as Partial<CourseCatalog>;
  const instructorName = catalogItem.instructorName || "Giảng viên LMS";
  const avgRating = catalogItem.avgRating ?? 5.0;

  const levelMap: Record<string, string> = {
    beginner: "Cơ bản",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
    all: "Mọi cấp độ",
  };
  const displayLevel = levelMap[course.level?.toLowerCase()] || course.level || "Khóa học";

  const gradientClass = useMemo(() => {
    const key = course.id || course.title || "";
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash + key.charCodeAt(i)) % FALLBACK_GRADIENTS.length;
    }
    return FALLBACK_GRADIENTS[hash];
  }, [course.id, course.title]);

  // Kiểu hiển thị Card đứng (Vertical Card 16:9)
  if (variant === "vertical") {
    return (
      <Link
        href={`/courses/${course.slug}`}
        className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-400 hover:shadow-lg ${className}`}
      >
        <div>
          {/* THUMBNAIL CONTAINER */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
            {course.thumbnailUrl && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className={`relative flex h-full w-full flex-col justify-between bg-gradient-to-tr ${gradientClass} p-4 text-white transition-transform duration-500 group-hover:scale-105`}
              >
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

          {/* CARD CONTENT: RATING & TIÊU ĐỀ */}
          <div className="p-5 space-y-3">
            {/* RATING & REVIEWS */}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-black text-amber-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{avgRating > 0 ? avgRating.toFixed(1) : "5.0"}</span>
              </span>
            </div>

            {/* TIÊU ĐỀ KHÓA HỌC */}
            <h3 className="line-clamp-2 text-sm sm:text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600">
              {course.title}
            </h3>
          </div>
        </div>

        {/* GIẢNG VIÊN (FOOTER CARD) */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
            <GraduationCap className="h-3 w-3" />
          </div>
          <span className="truncate font-medium">{instructorName}</span>
        </div>
      </Link>
    );
  }

  // Kiểu hiển thị Card ngang mặc định (Horizontal Card vuông ảnh phong cách Coursera)
  return (
    <Link
      href={`/courses/${course.slug}`}
      className={`group flex items-center gap-3.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md cursor-pointer w-full text-left ${className}`}
    >
      {/* KHỐI ẢNH VUÔNG BÊN TRÁI */}
      <div className="relative aspect-square w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-100">
        {course.thumbnailUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={`relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr ${gradientClass} p-2 text-white transition-transform duration-300 group-hover:scale-105`}
          >
            <BookOpen className="h-5 w-5 mb-0.5 opacity-90" />
            <span className="text-[9px] font-black tracking-tight text-white/90 text-center line-clamp-1">
              E7
            </span>
          </div>
        )}
      </div>

      {/* THÔNG TIN BÊN PHẢI */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        {/* GIẢNG VIÊN / TỔ CHỨC */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
            <GraduationCap className="h-2.5 w-2.5" />
          </div>
          <span className="truncate">{instructorName}</span>
        </div>

        {/* TIÊU ĐỀ KHÓA HỌC */}
        <h3 className="my-1 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 line-clamp-1 sm:line-clamp-2">
          {course.title}
        </h3>

        {/* TRÌNH ĐỘ / LOẠI KHÓA HỌC · SỐ SAO ĐÁNH GIÁ */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-600 truncate">{displayLevel}</span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1 font-bold text-amber-500 shrink-0">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{avgRating > 0 ? avgRating.toFixed(1) : "5.0"}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
