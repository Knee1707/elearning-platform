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

// Khóa học chi tiết mẫu khi DB chưa có dữ liệu
const FALLBACK_COURSE_DETAILS: Record<string, CourseDetail> = {
  "lap-trinh-web-nextjs": {
    id: "demo-course-1",
    instructorId: "demo-inst-1",
    categoryId: "cat-it",
    title: "Lập trình Web hiện đại với Next.js 14, React & TypeScript",
    slug: "lap-trinh-web-nextjs",
    description:
      "Khóa học thực chiến toàn diện giúp bạn làm chủ Next.js 14 App Router, Server Components, TypeScript, Tailwind CSS, tối ưu SEO và kết nối cơ sở dữ liệu Supabase Postgres bảo mật cao.",
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
    chapters: [
      {
        id: "chap-1",
        courseId: "demo-course-1",
        title: "Chương 1: Khởi động & Kiến trúc Next.js App Router",
        position: 1,
        lessons: [
          {
            id: "les-1",
            chapterId: "chap-1",
            title: "01. Giới thiệu tổng quan & Định hướng lộ trình học",
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            videoStatus: "ready",
            durationSeconds: 480,
            isFree: true,
            position: 1,
          },
          {
            id: "les-2",
            chapterId: "chap-1",
            title: "02. Cài đặt môi trường Node.js, pnpm và khởi tạo dự án",
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            videoStatus: "ready",
            durationSeconds: 720,
            isFree: true,
            position: 2,
          },
          {
            id: "les-3",
            chapterId: "chap-1",
            title: "03. Cơ chế Server Components vs Client Components",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 900,
            isFree: false,
            position: 3,
          },
        ],
      },
      {
        id: "chap-2",
        courseId: "demo-course-1",
        title: "Chương 2: Xây dựng Giao diện & Design Tokens với Tailwind CSS",
        position: 2,
        lessons: [
          {
            id: "les-4",
            chapterId: "chap-2",
            title: "04. Cấu hình Semantic Design Tokens và shadcn/ui",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 850,
            isFree: false,
            position: 1,
          },
          {
            id: "les-5",
            chapterId: "chap-2",
            title: "05. Thiết kế Header, Navbar và Navigation đa cấp",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 1100,
            isFree: false,
            position: 2,
          },
        ],
      },
      {
        id: "chap-3",
        courseId: "demo-course-1",
        title: "Chương 3: Kết nối CSDL Supabase, Auth & Bảo mật RLS",
        position: 3,
        lessons: [
          {
            id: "les-6",
            chapterId: "chap-3",
            title: "06. Khởi tạo Supabase Client & Quản lý phiên đăng nhập SSR",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 1250,
            isFree: false,
            position: 1,
          },
          {
            id: "les-7",
            chapterId: "chap-3",
            title: "07. Thiết lập Row Level Security (RLS) bảo vệ dữ liệu",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 1400,
            isFree: false,
            position: 2,
          },
        ],
      },
      {
        id: "chap-4",
        courseId: "demo-course-1",
        title: "Chương 4: Thi kết thúc khóa & Nhận Chứng chỉ Tốt nghiệp",
        position: 4,
        lessons: [
          {
            id: "les-8",
            chapterId: "chap-4",
            title: "08. Đánh giá cuối kỳ: Làm bài thi trắc nghiệm trực tuyến",
            videoUrl: null,
            videoStatus: "ready",
            durationSeconds: 1800,
            isFree: false,
            position: 1,
          },
        ],
      },
    ],
  },
};

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  let course: CourseDetail | null = null;
  let enrolled = false;

  try {
    course = await getCourseDetail(params.slug);
  } catch {
    course = null;
  }

  // Dùng dữ liệu demo fallback nếu DB chưa có hoặc đang test
  if (!course) {
    course = FALLBACK_COURSE_DETAILS[params.slug] || {
      id: `fallback-${params.slug}`,
      instructorId: "inst-default",
      categoryId: "cat-general",
      title: `Khóa học: ${decodeURIComponent(params.slug).replace(/-/g, " ")}`,
      slug: params.slug,
      description:
        "Khóa học chuyên sâu trang bị đầy đủ kiến thức từ nền tảng tới thực chiến, bài tập dự án thực tế và cấp chứng chỉ hoàn thành.",
      level: "intermediate",
      price: 399000,
      status: "published",
      thumbnailUrl: null,
      isFeatured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      instructorName: "Giảng viên LMS",
      avgRating: 4.8,
      ratingCount: 78,
      chapters: [
        {
          id: "demo-chap-1",
          courseId: `fallback-${params.slug}`,
          title: "Chương 1: Tổng quan và Khởi động",
          position: 1,
          lessons: [
            {
              id: "demo-les-1",
              chapterId: "demo-chap-1",
              title: "01. Giới thiệu nội dung khóa học",
              videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              videoStatus: "ready",
              durationSeconds: 420,
              isFree: true,
              position: 1,
            },
            {
              id: "demo-les-2",
              chapterId: "demo-chap-1",
              title: "02. Hướng dẫn thiết lập môi trường",
              videoUrl: null,
              videoStatus: "ready",
              durationSeconds: 650,
              isFree: false,
              position: 2,
            },
          ],
        },
      ],
    };
  }

  // Kiểm tra học viên đã ghi danh/mua khóa này chưa
  try {
    if (course.id && !course.id.startsWith("demo-") && !course.id.startsWith("fallback-")) {
      enrolled = await isEnrolled(course.id);
    }
  } catch {
    enrolled = false;
  }

  const totalLessons = course.chapters.reduce((acc, c) => acc + c.lessons.length, 0);
  const totalDurationSeconds = course.chapters.reduce(
    (acc, c) => acc + c.lessons.reduce((lAcc, l) => lAcc + l.durationSeconds, 0),
    0,
  );
  const totalDurationHours = (totalDurationSeconds / 3600).toFixed(1);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* COURSE HERO SECTION */}
        <div className="border-b border-border/50 bg-muted/30 py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {/* BREADCRUMB */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
              <Link href="/" className="hover:text-foreground transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/courses" className="hover:text-foreground transition-colors">
                Khóa học
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium truncate max-w-xs">{course.title}</span>
            </div>

            <div className="max-w-3xl space-y-4">
              {course.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3 w-3" />
                  <span>Khóa học nổi bật</span>
                </span>
              )}

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                {course.title}
              </h1>

              <p className="text-base text-muted-foreground leading-relaxed">
                {course.description}
              </p>

              {/* STATS ROW */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs text-muted-foreground">
                {/* SAO */}
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-sm">
                    {course.avgRating > 0 ? course.avgRating.toFixed(1) : "5.0"}
                  </span>
                  <span className="text-muted-foreground">
                    ({course.ratingCount > 0 ? course.ratingCount : 120} đánh giá)
                  </span>
                </div>

                {/* GIẢNG VIÊN */}
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>Giảng viên: <strong className="text-foreground">{course.instructorName}</strong></span>
                </div>

                {/* NGÀY CẬP NHẬT */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Cập nhật: {formatDate(course.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* CỘT TRÁI (NỘI DUNG CHÍNH) */}
            <div className="lg:col-span-2 space-y-10">
              {/* BẠN SẼ HỌC ĐƯỢC GÌ */}
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Bạn sẽ học được gì trong khóa học này?</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span>Làm chủ toàn bộ kiến thức cốt lõi và tư duy lập trình hiện đại.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span>Tự tay xây dựng và triển khai dự án thực tế chuẩn Production.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span>Tự động theo dõi tiến độ học tập và điểm danh chuyên cần qua video.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span>Làm bài thi trắc nghiệm kết khóa và nhận chứng chỉ danh dự xác thực.</span>
                  </div>
                </div>
              </section>

              {/* MỤC LỤC KHÓA HỌC (SYLLABUS ACCORDION) */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <span>Nội dung khóa học</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {course.chapters.length} chương • {totalLessons} bài học • Thời lượng ~{totalDurationHours} giờ
                    </p>
                  </div>

                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Có bài học thử miễn phí
                  </span>
                </div>

                {/* ACCORDION CHƯƠNG VÀ BÀI HỌC */}
                <CourseSyllabus chapters={course.chapters} />
              </section>

              {/* THÔNG TIN GIẢNG VIÊN */}
              <section className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span>Giảng viên phụ trách</span>
                </h2>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base shrink-0">
                    {course.instructorName ? course.instructorName.charAt(0) : "G"}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base text-foreground">
                      {course.instructorName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Giảng viên chuyên môn cao tại Nhom7EduLearn • Nhiều năm kinh nghiệm đào tạo thực chiến
                    </p>
                    <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                      Cam kết đồng hành cùng học viên trong suốt lộ trình, giải đáp mọi thắc mắc tại khu vực Thảo luận (Q&A) và tổ chức các buổi Live Session định kỳ.
                    </p>
                  </div>
                </div>
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
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

