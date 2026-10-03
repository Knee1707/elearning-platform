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
  ReceiptText,
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
  const [feedback, setFeedback] = useState<
    { id: string; content: string; createdAt: string; courseTitle: string; instructorName: string }[]
  >([]);

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
            setCourses([]);
          }
        } else if (isMounted) {
          // 2. Tra cứu thêm thông tin slug và thumbnail từ bảng courses để bảo đảm link chính xác
          const courseIds = Array.from(new Set((data as Array<Record<string, unknown>>).map((r) => r.course_id as string)));
          const { data: coursesInfo } = await supabase
            .from("courses")
            .select("id, slug, thumbnail_url, profiles!courses_instructor_id_fkey(full_name)")
            .in("id", courseIds);

          const courseMetaMap = new Map<string, { slug: string; thumbnail: string | null; instructor: string }>();
          if (coursesInfo) {
            for (const c of coursesInfo as Array<Record<string, unknown>>) {
              const prof = c.profiles as Record<string, unknown> | null;
              courseMetaMap.set(c.id as string, {
                slug: c.slug as string,
                thumbnail: (c.thumbnail_url as string) || null,
                instructor: (prof?.full_name as string) || "Giảng viên LMS",
              });
            }
          }

          // 3. Gom nhóm theo course_id để triệt tiêu hoàn toàn trùng lặp thẻ khóa học
          const courseMap = new Map<string, EnrolledCourseItem>();
          for (const row of data as Array<Record<string, unknown>>) {
            const cid = row.course_id as string;
            const meta = courseMetaMap.get(cid);
            const total = Number(row.total_lessons || 0);
            const completed = Number(row.completed_lessons || 0);

            const existing = courseMap.get(cid);
            if (!existing) {
              courseMap.set(cid, {
                courseId: cid,
                slug: meta?.slug || (row.slug as string) || cid,
                title: (row.course_title as string) || "Khóa học",
                instructorName: meta?.instructor || (row.instructor_name as string) || "Giảng viên LMS",
                totalLessons: total,
                completedLessons: completed,
                progressPercent: Number(row.progress_percent || 0),
                thumbnailUrl: meta?.thumbnail || (row.thumbnail_url as string) || null,
              });
            } else {
              // Gộp tiến độ nếu DB view cũ tách thành 2 dòng (do lp.user_id null)
              const newTotal = Math.max(existing.totalLessons, total);
              const newCompleted = Math.max(existing.completedLessons, completed);
              const newPercent = newTotal > 0 ? Math.round((newCompleted / newTotal) * 100) : existing.progressPercent;
              existing.totalLessons = newTotal;
              existing.completedLessons = newCompleted;
              existing.progressPercent = Math.max(existing.progressPercent, newPercent);
            }
          }

          setCourses(Array.from(courseMap.values()));
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

    async function loadFeedback() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase
          .from("student_feedback")
          .select("id, content, created_at, courses(title), profiles!student_feedback_instructor_id_fkey(full_name)")
          .eq("student_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (isMounted && data) {
          setFeedback(
            (data as any[]).map((r) => ({
              id: r.id,
              content: r.content,
              createdAt: r.created_at,
              courseTitle: r.courses?.title ?? "Khóa học",
              instructorName: r.profiles?.full_name ?? "Giảng viên",
            })),
          );
        }
      } catch {
        /* bỏ qua */
      }
    }

    loadMyCourses();
    loadFeedback();

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8 sm:px-6">
        {/* Header trang */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-bold text-blue-700 uppercase tracking-wider">
              <GraduationCap className="h-4 w-4" />
              <span>Góc học tập cá nhân</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Khóa học của tôi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Theo dõi tiến trình học tập, hoàn thành bài giảng và nhận chứng chỉ chính quy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/my/purchases"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
            >
              <ReceiptText className="h-4 w-4 text-slate-500" />
              <span>Lịch sử mua &amp; hoàn tiền</span>
            </Link>
            <Link
              href="/certificates"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 active:scale-95"
            >
              <Award className="h-4 w-4 text-amber-500" />
              <span>Chứng chỉ của tôi</span>
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Khám phá thêm khóa</span>
            </Link>
          </div>
        </div>

        {/* Thanh công cụ: Tabs lọc & Tìm kiếm */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 p-1.5 text-xs font-semibold w-full sm:w-auto border border-slate-200/60">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`flex-1 sm:flex-initial rounded-full px-4 py-1.5 transition-all ${
                filterTab === "all" ? "bg-blue-600 text-white font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả ({courses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("in_progress")}
              className={`flex-1 sm:flex-initial rounded-full px-4 py-1.5 transition-all ${
                filterTab === "in_progress" ? "bg-blue-600 text-white font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đang học ({courses.filter((c) => c.progressPercent < 100).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("completed")}
              className={`flex-1 sm:flex-initial rounded-full px-4 py-1.5 transition-all ${
                filterTab === "completed" ? "bg-blue-600 text-white font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đã hoàn thành ({courses.filter((c) => c.progressPercent === 100).length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm khóa học..."
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
            />
          </div>
        </div>

        {/* Danh sách khóa học */}
        <div className="mt-8">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-400 font-medium">
              Đang tải danh sách khóa học của bạn...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
              <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-base font-bold text-slate-900">
                {searchQuery ? "Không tìm thấy khóa học phù hợp" : "Chưa có khóa học nào"}
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? "Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc."
                  : "Bạn chưa đăng ký khóa học nào trong danh mục này. Hãy bắt đầu nâng cao kiến thức ngay hôm nay!"}
              </p>
              <div className="mt-6">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
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
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div>
                    {/* Header card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            course.progressPercent === 100
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-blue-50 text-blue-700 border border-blue-200/60"
                          }`}
                        >
                          {course.progressPercent === 100 ? "Hoàn thành 100%" : "Đang học"}
                        </span>
                        <h3 className="mt-2 text-base font-black leading-snug text-slate-900 line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 font-medium">
                          Giảng viên: <span className="text-slate-800">{course.instructorName}</span>
                        </p>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                        <BookOpen className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Thanh tiến độ */}
                    <div className="mt-5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Tiến độ bài giảng</span>
                        <span className="font-bold text-blue-600 font-mono">
                          {course.completedLessons}/{course.totalLessons} bài ({course.progressPercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full transition-all duration-500 ${
                            course.progressPercent === 100
                              ? "bg-emerald-500"
                              : "bg-gradient-to-r from-blue-600 to-indigo-600"
                          }`}
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {course.lastStudiedLessonTitle && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                        <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">Học gần nhất: {course.lastStudiedLessonTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Hành động dưới cùng */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    {course.progressPercent === 100 ? (
                      <Link
                        href="/certificates"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <Award className="h-4 w-4" />
                        <span>Xem chứng chỉ</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        {course.totalLessons - course.completedLessons} bài còn lại
                      </span>
                    )}

                    <Link
                      href={`/learn/${course.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 hover:gap-2 active:scale-95"
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

        {/* NHẬN XÉT TỪ GIẢNG VIÊN */}
        {feedback.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Nhận xét từ giảng viên
            </h2>
            <div className="space-y-3">
              {feedback.map((f) => (
                <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{f.instructorName}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(f.createdAt).toLocaleDateString("vi-VN")} · {f.courseTitle}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700">{f.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
