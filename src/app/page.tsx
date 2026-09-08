import Link from "next/link";
import {
  Compass,
  BookOpen,
  Award,
  Video,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  GraduationCap,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { CourseCard } from "@/components/shared/CourseCard";
import { getCourseCatalog, type CourseCatalog } from "@/lib/queries/courses";

// Dữ liệu mẫu dự phòng (được dùng khi DB chưa có khóa học hoặc chưa seed)
const FALLBACK_COURSES: CourseCatalog[] = [
  {
    id: "demo-course-1",
    instructorId: "demo-inst-1",
    categoryId: "cat-it",
    title: "Lập trình Web hiện đại với Next.js 14, React & TypeScript",
    slug: "lap-trinh-web-nextjs",
    description: "Xây dựng ứng dụng web chuẩn Production từ cơ bản đến nâng cao cùng SSR, RLS và Server Actions.",
    level: "intermediate",
    price: 499000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "ThS. Nguyễn Văn A",
    avgRating: 4.9,
    ratingCount: 142,
  },
  {
    id: "demo-course-2",
    instructorId: "demo-inst-2",
    categoryId: "cat-db",
    title: "Cơ sở dữ liệu PostgreSQL & Supabase Chuyên sâu",
    slug: "postgresql-supabase-chuyen-sau",
    description: "Làm chủ RLS, Stored Procedures, Triggers và kiến trúc bảo mật đa tầng cho ứng dụng lớn.",
    level: "advanced",
    price: 399000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "TS. Trần Thị B",
    avgRating: 4.8,
    ratingCount: 96,
  },
  {
    id: "demo-course-3",
    instructorId: "demo-inst-3",
    categoryId: "cat-fe",
    title: "Nhập môn Lập trình Giao diện Web (HTML5, CSS3, Tailwind)",
    slug: "nhap-mon-frontend",
    description: "Khóa học miễn phí dành cho người mới bắt đầu muốn tạo dựng các trang web đẹp mắt và responsive.",
    level: "beginner",
    price: 0,
    status: "published",
    thumbnailUrl: null,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "Kỹ sư Lê Hoàng C",
    avgRating: 4.7,
    ratingCount: 215,
  },
];

export default async function HomePage() {
  let courses: CourseCatalog[] = [];

  try {
    courses = await getCourseCatalog();
  } catch {
    // Nếu chưa cấu hình Supabase hoặc DB trống, dùng dữ liệu demo để trang luôn hiển thị đẹp
    courses = [];
  }

  const displayCourses = courses.length > 0 ? courses : FALLBACK_COURSES;
  const featuredCourses = displayCourses.filter((c) => c.isFeatured);
  const spotlightList = featuredCourses.length > 0 ? featuredCourses : displayCourses.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* NAVBAR */}
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/50 via-background to-background py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center space-y-6">
              {/* BADGE */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Nền tảng học tập trực tuyến thông minh</span>
              </div>

              {/* HEADING */}
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                Nâng Tầm Kỹ Năng Cùng{" "}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Nhom7EduLearn
                </span>
              </h1>

              {/* SUBTITLE */}
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Nền tảng đào tạo trực tuyến hiện đại với lộ trình chuẩn chỉ. Học qua video tương tác,
                điểm danh tự động, phòng học trực tiếp Google Meet và nhận chứng chỉ xác thực công khai.
              </p>

              {/* CTA BUTTONS */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/courses"
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                >
                  <Compass className="h-4 w-4" />
                  <span>Khám phá khóa học</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/my"
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>Khóa học của tôi</span>
                </Link>
              </div>

              {/* STATS BAR */}
              <div className="pt-8 border-t border-border/60 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">100+</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Khóa học chất lượng</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">10.000+</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Học viên tích cực</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">98%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tỷ lệ hài lòng</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">100%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Chứng chỉ xác thực</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED COURSES SECTION */}
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Lựa chọn hàng đầu</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                  Khóa học nổi bật
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Những khóa học được nhiều học viên đánh giá cao và lựa chọn nhất
                </p>
              </div>

              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <span>Xem tất cả khóa học</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* GRID COURSES */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {spotlightList.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>

        {/* WHY CHOOSE US SECTION */}
        <section className="border-t border-border/40 bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Trải nghiệm vượt trội
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Tại sao chọn học tại Nhom7EduLearn?
              </h2>
              <p className="text-sm text-muted-foreground">
                Chúng tôi mang đến hệ sinh thái học tập khép kín, tiện lợi và chú trọng kết quả thực tế.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* FEATURE 1 */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Video className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base text-foreground">
                  Học qua Video & Điểm danh tự động
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Trình phát video thông minh tự động lưu giây đang xem dở, tự động ghi nhận điểm danh
                  chuyên cần khi bạn theo dõi đạt từ 95% thời lượng.
                </p>
              </div>

              {/* FEATURE 2 */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base text-foreground">
                  Buổi học Trực tiếp (Live Session)
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Hòa mình vào các lớp học trực tuyến Google Meet cùng giảng viên chỉ với 1 click, hệ
                  thống tự động gác quyền và ghi nhận có mặt.
                </p>
              </div>

              {/* FEATURE 3 */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base text-foreground">
                  Chứng chỉ Trang trọng & Xác thực
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Thi trắc nghiệm kết thúc khóa để nhận chứng chỉ danh dự cổ điển. Bất kỳ nhà tuyển
                  dụng nào cũng có thể tra cứu mã chứng chỉ công khai.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ROLE SHORTCUTS SECTION (Dành cho thầy cô / bạn cùng nhóm trải nghiệm nhanh) */}
        <section className="py-12 border-t border-border/40">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-xl border border-dashed border-border p-6 bg-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Lối tắt truy cập các phân hệ (Dành cho Giảng viên & Quản trị)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Truy cập nhanh các màn hình chức năng thuộc phạm vi toàn hệ thống LMS
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/studio"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Studio Giảng viên (M4) →
                  </Link>
                  <Link
                    href="/admin"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Quản trị Admin (M4) →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-muted/40 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Nhom7EduLearn</span>
            <span>— Đồ án LMS Đào tạo trực tuyến</span>
          </div>
          <p>© 2026 Nhóm 7 — Trường ĐH Sư phạm Kỹ thuật TP.HCM (HCMUTE).</p>
        </div>
      </footer>
    </div>
  );
}
