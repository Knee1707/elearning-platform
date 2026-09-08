"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  PlayCircle,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Search,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { createClient } from "@/lib/supabase/client";

interface EnrolledCourseItem {
  courseId: string;
  slug: string;
  title: string;
  instructorName: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  thumbnailUrl: string | null;
  lastStudiedLessonTitle?: string;
}

// Danh sách khóa học mẫu khi offline / demo
const FALLBACK_MY_COURSES: EnrolledCourseItem[] = [
  {
    courseId: "20000000-0000-0000-0000-000000000001",
    slug: "nextjs-co-ban-nang-cao",
    title: "Khóa học Next.js từ cơ bản đến nâng cao",
    instructorName: "Nguyễn Văn Giảng Viên",
    totalLessons: 4,
    completedLessons: 2,
    progressPercent: 50,
    thumbnailUrl: null,
    lastStudiedLessonTitle: "Bài 3: Server Components",
  },
  {
    courseId: "demo-course-1",
    slug: "lap-trinh-web-nextjs",
    title: "Lập trình Web hiện đại với Next.js 14, React & TypeScript",
    instructorName: "ThS. Nguyễn Văn A",
    totalLessons: 6,
    completedLessons: 3,
    progressPercent: 50,
    thumbnailUrl: null,
    lastStudiedLessonTitle: "04. Cấu hình Semantic Design Tokens và shadcn/ui",
  },
];

export default function MyLearningPage() {
  const [courses, setCourses] = useState<EnrolledCourseItem[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "in_progress" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMyCourses() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("view_course_progress")
          .select("*");

        if (error || !data || data.length === 0) {
          if (isMounted) {
            setCourses(FALLBACK_MY_COURSES);
          }
        } else if (isMounted) {
          const mapped: EnrolledCourseItem[] = (data as Array<Record<string, unknown>>).map((row) => ({
            courseId: row.course_id as string,
            slug: (row.slug as string) || (row.course_id as string),
            title: row.course_title as string,
            instructorName: (row.instructor_name as string) || "Giảng viên",
            totalLessons: Number(row.total_lessons || 0),
            completedLessons: Number(row.completed_lessons || 0),
            progressPercent: Number(row.progress_percent || 0),
            thumbnailUrl: (row.thumbnail_url as string) || null,
          }));
          setCourses(mapped);
        }
      } catch {
        if (isMounted) {
          setCourses(FALLBACK_MY_COURSES);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMyCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  // Lọc theo tab và tìm kiếm
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterTab === "in_progress") return c.progressPercent < 100;
    if (filterTab === "completed") return c.progressPercent === 100;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8 sm:px-6">
        {/* Header trang */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <GraduationCap className="h-4 w-4" />
              <span>Góc học tập cá nhân</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Khóa học của tôi
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Theo dõi tiến trình học tập, hoàn thành bài giảng và nhận chứng chỉ chính quy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/certificates"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <Award className="h-4 w-4 text-amber-500" />
              <span>Chứng chỉ của tôi</span>
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              <span>Khám phá thêm khóa</span>
            </Link>
          </div>
        </div>

        {/* Thanh công cụ: Tabs lọc & Tìm kiếm */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1 text-xs font-medium w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`flex-1 sm:flex-initial rounded-lg px-3.5 py-1.5 transition-colors ${
                filterTab === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả ({courses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("in_progress")}
              className={`flex-1 sm:flex-initial rounded-lg px-3.5 py-1.5 transition-colors ${
                filterTab === "in_progress" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đang học ({courses.filter((c) => c.progressPercent < 100).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("completed")}
              className={`flex-1 sm:flex-initial rounded-lg px-3.5 py-1.5 transition-colors ${
                filterTab === "completed" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đã hoàn thành ({courses.filter((c) => c.progressPercent === 100).length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm khóa học..."
              className="w-full rounded-xl border border-border bg-card py-1.5 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Danh sách khóa học */}
        <div className="mt-8">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              Đang tải danh sách khóa học của bạn...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {searchQuery ? "Không tìm thấy khóa học phù hợp" : "Chưa có khóa học nào"}
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {searchQuery
                  ? "Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc."
                  : "Bạn chưa đăng ký khóa học nào trong danh mục này. Hãy bắt đầu nâng cao kiến thức ngay hôm nay!"}
              </p>
              <div className="mt-6">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Duyệt danh mục khóa học</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.courseId}
                  className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div>
                    {/* Header card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {course.progressPercent === 100 ? "Hoàn thành 100%" : "Đang học"}
                        </span>
                        <h3 className="mt-2 text-sm font-bold leading-snug text-foreground line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Giảng viên: {course.instructorName}
                        </p>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                        <BookOpen className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Thanh tiến độ */}
                    <div className="mt-5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tiến độ bài giảng</span>
                        <span className="font-bold text-foreground">
                          {course.completedLessons}/{course.totalLessons} bài ({course.progressPercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all duration-500 ${
                            course.progressPercent === 100 ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {course.lastStudiedLessonTitle && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">Học gần nhất: {course.lastStudiedLessonTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Hành động dưới cùng */}
                  <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                    {course.progressPercent === 100 ? (
                      <Link
                        href="/certificates"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <Award className="h-4 w-4" />
                        <span>Xem chứng chỉ</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {course.totalLessons - course.completedLessons} bài còn lại
                      </span>
                    )}

                    <Link
                      href={`/learn/${course.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:gap-2"
                    >
                      <PlayCircle className="h-4 w-4" />
                      <span>{course.progressPercent === 100 ? "Ôn tập lại" : "Tiếp tục học"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
