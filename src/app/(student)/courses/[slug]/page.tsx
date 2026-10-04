import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star,
  User,
  Clock,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Calendar,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { getCourseDetail, type CourseDetail } from "@/lib/queries/courses";
import { isEnrolled } from "@/lib/queries/commerce";
import { formatDate } from "@/lib/utils";
import { CourseDetailActions, CourseSyllabus } from "./CourseDetailActions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/auth";
import { ReportButton } from "@/features/report/ReportButton";
import { ReviewForm } from "@/features/review/ReviewForm";
import type { ReviewStatus } from "@/types/domain";

interface PublicReview {
  id: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string;
}

// Review đã được kiểm duyệt (status = visible) của khóa thật.
async function getVisibleReviews(courseId: string): Promise<PublicReview[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, user_id, rating, comment, created_at, profiles(full_name)")
    .eq("course_id", courseId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    rating: Number(row.rating),
    comment: (row.comment as string | null) ?? null,
    createdAt: String(row.created_at),
    authorName: (row.profiles as unknown as { full_name?: string } | null)?.full_name || "Học viên",
  }));
}

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  let course: CourseDetail | null = null;
  let enrolled = false;

  try {
    course = await getCourseDetail(params.slug);
  } catch {
    course = null;
  }

  if (!course) {
    notFound();
  }

  // Kiểm tra học viên đã ghi danh/mua khóa này chưa
  try {
    if (course.id && !course.id.startsWith("demo-") && !course.id.startsWith("fallback-")) {
      enrolled = await isEnrolled(course.id);
    }
  } catch {
    enrolled = false;
  }

  // Trạng thái ghi danh (none/pending/active) cho khóa miễn phí cần duyệt.
  let enrollStatus: "none" | "pending" | "active" = enrolled ? "active" : "none";
  try {
    if (!enrolled && course.id && !course.id.startsWith("demo-") && !course.id.startsWith("fallback-")) {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: enr } = await sb
          .from("enrollments")
          .select("status")
          .eq("user_id", user.id)
          .eq("course_id", course.id)
          .maybeSingle();
        if (enr?.status === "pending") enrollStatus = "pending";
        else if (enr?.status === "active") enrollStatus = "active";
      }
    }
  } catch {
    /* giữ 'none' */
  }

  // Khóa demo/fallback (chưa có trong DB) không có review thật và không báo cáo được.
  const isRealCourse = Boolean(course.id) && !course.id.startsWith("demo-") && !course.id.startsWith("fallback-");
  const [currentUser, reviews] = await Promise.all([
    getCurrentUser().catch(() => null),
    isRealCourse ? getVisibleReviews(course.id).catch(() => []) : Promise.resolve([] as PublicReview[]),
  ]);
  const isLoggedIn = Boolean(currentUser);

  // Review của chính học viên (mọi trạng thái) để điền sẵn form khi sửa.
  let myReview: { rating: number; comment: string | null; status: ReviewStatus } | null = null;
  if (isRealCourse && currentUser && enrolled) {
    const { data } = await createClient()
      .from("reviews")
      .select("rating, comment, status")
      .eq("course_id", course.id)
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (data) myReview = { rating: Number(data.rating), comment: data.comment ?? null, status: data.status as ReviewStatus };
  }
  const coursePath = `/courses/${course.slug}`;

  const totalLessons = course.chapters.reduce((acc, c) => acc + c.lessons.length, 0);
  const totalDurationSeconds = course.chapters.reduce(
    (acc, c) => acc + c.lessons.reduce((lAcc, l) => lAcc + l.durationSeconds, 0),
    0,
  );
  const totalDurationHours = (totalDurationSeconds / 3600).toFixed(1);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* COURSE HERO SECTION (PrepEdu Style) */}
        <div className="border-b border-slate-200 bg-white py-8 lg:py-12 shadow-xs">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* BREADCRUMB */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
              <Link href="/" className="hover:text-blue-600 transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/courses" className="hover:text-blue-600 transition-colors">
                Khóa học
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-800 font-bold truncate max-w-xs">{course.title}</span>
            </div>

            <div className="max-w-3xl space-y-4">
              {course.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-blue-950 shadow-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>Khóa học nổi bật</span>
                </span>
              )}

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                {course.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {course.description}
              </p>

              {/* STATS ROW */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs text-slate-500">
                {/* SAO */}
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm">
                    {course.avgRating > 0 ? course.avgRating.toFixed(1) : "5.0"}
                  </span>
                  <span className="text-slate-400 font-normal">
                    ({course.ratingCount > 0 ? course.ratingCount : 120} học viên đánh giá)
                  </span>
                </div>

                {/* GIẢNG VIÊN */}
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span>Giảng viên: <strong className="text-slate-900">{course.instructorName}</strong></span>
                </div>

                {/* NGÀY CẬP NHẬT */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Cập nhật mới: {formatDate(course.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* CỘT TRÁI (NỘI DUNG CHÍNH) */}
            <div className="lg:col-span-2 space-y-8">
              {/* BẠN SẼ HỌC ĐƯỢC GÌ */}
              <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Bạn sẽ học và làm được gì sau khóa học?</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-black shrink-0">✓</span>
                    <span>Làm chủ toàn bộ kiến thức cốt lõi và tư duy lập trình hiện đại.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-black shrink-0">✓</span>
                    <span>Tự tay xây dựng và triển khai dự án thực tế chuẩn Production.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-black shrink-0">✓</span>
                    <span>Tự động theo dõi tiến độ học tập và điểm danh chuyên cần qua video.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-black shrink-0">✓</span>
                    <span>Làm bài thi trắc nghiệm kết khóa và nhận chứng chỉ danh dự xác thực QR.</span>
                  </div>
                </div>
              </section>

              {/* MỤC LỤC KHÓA HỌC (SYLLABUS ACCORDION) */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span>Giáo trình & Nội dung chi tiết</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {course.chapters.length} chương • {totalLessons} bài học • Thời lượng ~{totalDurationHours} giờ
                    </p>
                  </div>

                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full">
                    ✓ Có bài học thử miễn phí
                  </span>
                </div>

                {/* ACCORDION CHƯƠNG VÀ BÀI HỌC */}
                <CourseSyllabus chapters={course.chapters} />
              </section>

              {/* THÔNG TIN GIẢNG VIÊN */}
              <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  <span>Giảng viên hướng dẫn</span>
                </h2>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 font-bold text-lg shrink-0">
                    {course.instructorName ? course.instructorName.charAt(0) : "G"}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-slate-900">
                      {course.instructorName}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600">
                      Giảng viên Chuyên môn cao tại Nhom7Edu • Nhiều năm kinh nghiệm đào tạo
                    </p>
                    <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                      Cam kết đồng hành cùng học viên trong suốt lộ trình, giải đáp mọi thắc mắc tại khu vực Thảo luận (Q&A) và tổ chức các buổi Live Session định kỳ.
                    </p>
                    {isRealCourse && currentUser?.id !== course.instructorId && (
                      <div className="pt-1">
                        <ReportButton entity="user" entityId={course.instructorId} label="Báo cáo giảng viên" isLoggedIn={isLoggedIn} loginNext={coursePath} />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ĐÁNH GIÁ TỪ HỌC VIÊN (STUDENT REVIEWS) */}
              <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      <span>Đánh giá &amp; Nhận xét từ học viên</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isRealCourse
                        ? course.ratingCount > 0
                          ? `Dựa trên ${course.ratingCount} đánh giá đã được kiểm duyệt`
                          : "Chưa có đánh giá nào được duyệt"
                        : `Dựa trên ${course.ratingCount > 0 ? course.ratingCount : 120} đánh giá đã được kiểm duyệt`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-amber-50/80 border border-amber-100/80 px-4 py-2.5 rounded-2xl">
                    <div className="text-3xl font-black text-amber-600">
                      {course.avgRating > 0 ? course.avgRating.toFixed(1) : isRealCourse ? "–" : "4.9"}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-[11px] font-medium text-slate-600">Chất lượng xuất sắc</p>
                    </div>
                  </div>
                </div>

                {isRealCourse && enrolled && isLoggedIn && (
                  <ReviewForm courseId={course.id} coursePath={coursePath} existing={myReview} />
                )}

                {isRealCourse ? (
                  reviews.length ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {review.authorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900">{review.authorName}</span>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <div className="flex text-amber-400">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-current" : "text-slate-200"}`} />
                                  ))}
                                </div>
                                <span>• {formatDate(review.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          {review.comment && <p className="text-xs leading-relaxed text-slate-600">{review.comment}</p>}
                          {currentUser?.id !== review.userId && (
                            <ReportButton entity="review" entityId={review.id} label="Báo cáo đánh giá" isLoggedIn={isLoggedIn} loginNext={coursePath} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Chưa có đánh giá nào cho khóa học này.</p>
                  )
                ) : (
                  <>
                  {/* DANH SÁCH REVIEW MẪU TIÊU BIỂU */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            HV
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">Hoàng Văn Nam</span>
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành khóa
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className="h-3 w-3 fill-current" />
                                ))}
                              </div>
                              <span>• 1 tuần trước</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Khóa học rất thực chiến, các bài giảng Next.js và Supabase RLS được giải thích cặn kẽ. Điểm danh tự động qua video và làm bài thi kết khóa nhận chứng chỉ rất chuyên nghiệp!
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            NT
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">Nguyễn Thu Thảo</span>
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành khóa
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className="h-3 w-3 fill-current" />
                                ))}
                              </div>
                              <span>• 2 tuần trước</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Giao diện học tập rất sáng sủa, dễ nhìn. Tính năng tạo ghi chú gắn mốc thời gian video giúp mình ôn tập lại kiến thức trước khi thi rất nhanh.
                      </p>
                    </div>
                  </div>
                  </>
                )}
              </section>
            </div>

            {/* CỘT PHẢI (STICKY ACTION CARD) */}
            <div className="lg:col-span-1">
              <CourseDetailActions
                courseId={course.id}
                courseSlug={course.slug}
                courseTitle={course.title}
                price={course.price}
                initialEnrolled={enrolled}
                enrollStatus={enrollStatus}
              />
              {isRealCourse && currentUser?.id !== course.instructorId && (
                <div className="mt-3 px-1">
                  <ReportButton entity="course" entityId={course.id} label="Báo cáo khóa học này" isLoggedIn={isLoggedIn} loginNext={coursePath} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

