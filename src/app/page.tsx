import Link from "next/link";
import {
  Compass,
  BookOpen,
  Award,
  Video,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { CourseCard } from "@/components/shared/CourseCard";
import {
  getCoursesByCategories,
  type CategoryGroup,
  FALLBACK_CATEGORY_GROUPS,
} from "@/lib/queries/courses";

export default async function HomePage() {
  let categoryGroups: CategoryGroup[] = [];

  try {
    categoryGroups = await getCoursesByCategories();
  } catch {
    categoryGroups = FALLBACK_CATEGORY_GROUPS;
  }

  if (!categoryGroups || categoryGroups.length === 0) {
    categoryGroups = FALLBACK_CATEGORY_GROUPS;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* TOP PROMO BANNER (Phong cách PrepEdu) */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white text-xs py-2.5 px-4 text-center font-medium flex items-center justify-center gap-2 shadow-inner">
        <span className="bg-amber-400 text-blue-950 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide">
          Ưu đãi mới
        </span>
        <span>
          Nhập mã <strong className="underline decoration-amber-400 font-bold">SAVE100K</strong> khi thanh toán để giảm ngay 100.000₫ cho mọi khóa học!
        </span>
      </div>

      {/* NAVBAR */}
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* CỘT TRÁI: TIÊU ĐỀ & CTA */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* BADGE */}
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Hệ thống Đào tạo Lập trình Thực chiến 2026</span>
                </div>

                {/* HEADING */}
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl text-slate-900 leading-tight">
                  Nâng tầm kỹ năng công nghệ cùng{" "}
                  <span className="text-blue-600">
                    Lộ trình chuẩn Thực chiến
                  </span>
                </h1>

                {/* SUBTITLE */}
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Nền tảng học trực tuyến thông minh giúp bạn làm chủ công nghệ từ số 0. Học qua video bài giảng chất lượng cao,
                  thực hành tương tác, làm quiz đo lường năng lực và nhận chứng chỉ xác thực QR ngay sau khi tốt nghiệp.
                </p>

                {/* CTA BUTTONS (Pill Shapes) */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link
                    href="/courses"
                    className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95"
                  >
                    <Compass className="h-4 w-4" />
                    <span>Khám phá 50+ khóa học</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/courses/nhap-mon-frontend"
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-blue-300 active:scale-95"
                  >
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span>Học thử miễn phí</span>
                  </Link>
                </div>

                {/* STATS BAR */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-4 sm:grid-cols-4 text-left">
                  <div>
                    <p className="text-2xl font-black text-slate-900 font-mono">12.000+</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Học viên tham gia</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900 font-mono">50+</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Khóa học chất lượng</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-amber-500 font-mono">★ 4.9/5</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Đánh giá xuất sắc</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-emerald-600 font-mono">100%</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Chứng chỉ xác thực QR</p>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: BANNER THẺ NỔI (PrepEdu Style) */}
              <div className="lg:col-span-5 relative hidden sm:block">
                <div className="rounded-3xl bg-gradient-to-tr from-blue-100/70 via-indigo-50/50 to-blue-50/60 p-6 border border-blue-200/70 shadow-xl">
                  {/* Floating Achievement Badge */}
                  <div className="rounded-2xl bg-white p-4 shadow-lg border border-slate-100 mb-4 flex items-center gap-3 animate-float-soft">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-bold">
                      🏆
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Chứng chỉ Hoàn thành Chuẩn LMS</span>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        ✓ Mã định danh xác thực công khai
                      </span>
                    </div>
                  </div>

                  {/* Course Progress Card */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                        Đang học gần đây
                      </span>
                      <span className="text-xs font-mono text-blue-600 font-bold">85% Hoàn thành</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Lập trình Fullstack Next.js 14 & Supabase</h4>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full w-[85%] rounded-full"></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Còn 2 bài học & 1 bài thi Quiz</span>
                      <Link href="/courses" className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-all">
                        Tiếp tục học
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* COURSES BY CATEGORY SECTION (Coursera Style: 3 Columns x 3 Cards) */}
        <section className="py-14 sm:py-20 bg-white border-y border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Khóa học được yêu thích</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-2">
                  Khóa học theo Danh mục
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Được thiết kế bám sát thực tế tuyển dụng, cập nhật công nghệ mới nhất 2026
                </p>
              </div>

              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-all"
              >
                <span>Xem tất cả khóa học</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 3 CỘT DANH MỤC X 3 THẺ CARD NGANG */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {categoryGroups.slice(0, 3).map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col justify-between rounded-2xl border border-blue-100/70 bg-[#F0F5FF] p-4 sm:p-5 shadow-xs"
                >
                  <div>
                    <Link
                      href={`/courses?category=${group.slug}`}
                      className="group/cat mb-4 flex items-center gap-1.5 text-base sm:text-lg font-bold text-slate-900 transition-colors hover:text-blue-600"
                    >
                      <span>{group.name}</span>
                      <ArrowRight className="h-4 w-4 text-slate-700 transition-transform group-hover/cat:translate-x-1 group-hover/cat:text-blue-600" />
                    </Link>

                    <div className="flex flex-col gap-3">
                      {group.courses.slice(0, 3).map((course) => (
                        <CourseCard key={course.id} course={course} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY CHOOSE US SECTION (Coursera & DataCamp Style: Tự định độ, Quiz thực hành, Chứng chỉ số) */}
        <section className="py-16 sm:py-24 bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
                Trải nghiệm học tập chuẩn quốc tế
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Phương pháp học tập hiệu quả tại Nhom7Edu
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Mô hình học tập tự định độ kết hợp video bài giảng chuyên sâu, bài tập trắc nghiệm thực hành và chứng chỉ số hóa chuẩn đầu ra.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* FEATURE 1: VIDEO ON-DEMAND & SELF-PACED */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Video className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Video Bài giảng & Tự định độ (Self-Paced)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Chủ động học tập mọi lúc, mọi nơi theo lịch trình cá nhân. Trình phát video chuyên nghiệp hỗ trợ tùy chỉnh tốc độ, tự động lưu mốc học dở dang và mở khóa bài học tuần tự theo lộ trình rõ ràng.
                </p>
              </div>

              {/* FEATURE 2: INTERACTIVE PRACTICE & QUIZZES */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-300 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Thực hành Tương tác & Đánh giá qua Quiz
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Củng cố và kiểm tra kiến thức ngay sau mỗi bài học với hệ thống câu hỏi trắc nghiệm tương tác, nhận phản hồi và chấm điểm tự động tức thì giúp bạn nắm vững kiến thức từ lý thuyết đến ứng dụng.
                </p>
              </div>

              {/* FEATURE 3: VERIFIABLE CERTIFICATE */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-amber-300 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Award className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Chứng chỉ Chuyên nghiệp Xác thực QR
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Hoàn thành toàn bộ lộ trình và vượt qua bài thi chuẩn đầu ra để nhận chứng chỉ điện tử chính thức. Tích hợp mã định danh QR tra cứu công khai, dễ dàng chia sẻ lên hồ sơ LinkedIn và CV xin việc.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs">
              E7
            </div>
            <span className="font-bold text-slate-900">Nhom7Edu</span>
            <span>— Hệ thống Quản lý Học tập LMS Trực tuyến</span>
          </div>
          <p>© 2026 Nhóm 7 — Trường ĐH Công nghệ Kỹ thuật TP.HCM (HCM-UTE).</p>
        </div>
      </footer>
    </div>
  );
}
