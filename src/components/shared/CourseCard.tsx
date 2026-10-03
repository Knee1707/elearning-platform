"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Star, BookOpen, GraduationCap } from "lucide-react";
import type { Course } from "@/types/domain";
import type { CourseCatalog } from "@/lib/queries/courses";

// Thẻ khóa học dạng ngang (Horizontal Shape) phong cách Coursera:
// [Ảnh vuông] | [Giảng viên / Tổ chức]
//             | [Tiêu đề khóa học]
//             | [Trình độ / Loại] · ★ [Rating]
interface CourseCardProps {
  course: Course | CourseCatalog;
  className?: string;
}

const FALLBACK_GRADIENTS = [
  "from-blue-700 via-blue-600 to-indigo-800",
  "from-indigo-700 via-purple-600 to-violet-800",
  "from-slate-800 via-slate-700 to-zinc-900",
  "from-sky-700 via-blue-600 to-cyan-800",
  "from-emerald-700 via-teal-600 to-cyan-800",
];

export function CourseCard({ course, className = "" }: CourseCardProps) {
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
