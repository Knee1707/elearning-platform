import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { CourseCard } from "@/components/shared/CourseCard";
import { searchCourses, getCourseCatalog, type CourseCatalog } from "@/lib/queries/courses";

// Dữ liệu mẫu dự phòng khi database chưa có dữ liệu
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
  {
    id: "demo-course-4",
    instructorId: "demo-inst-4",
    categoryId: "cat-be",
    title: "Xây dựng RESTful API & Microservices với Node.js & Express",
    slug: "nodejs-restful-api",
    description: "Thiết kế hệ thống Backend chịu tải cao, JWT Authentication, phân quyền và Docker hóa.",
    level: "intermediate",
    price: 350000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "ThS. Phạm Quốc D",
    avgRating: 4.6,
    ratingCount: 88,
  },
  {
    id: "demo-course-5",
    instructorId: "demo-inst-5",
    categoryId: "cat-mobile",
    title: "Lập trình Ứng dụng Di động Đa nền tảng với Flutter & Dart",
    slug: "lap-trinh-flutter-dart",
    description: "Phát triển ứng dụng iOS và Android từ một cơ sở mã nguồn duy nhất với hiệu năng đỉnh cao.",
    level: "beginner",
    price: 550000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "TS. Vũ Hải E",
    avgRating: 4.9,
    ratingCount: 110,
  },
  {
    id: "demo-course-6",
    instructorId: "demo-inst-6",
    categoryId: "cat-devops",
    title: "DevOps Thực Chiến: Docker, Kubernetes & CI/CD Pipeline",
    slug: "devops-docker-cicd",
    description: "Tự động hóa triển khai, giám sát hệ thống và tối ưu hóa quy trình release phần mềm doanh nghiệp.",
    level: "advanced",
    price: 600000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "Kỹ sư Đặng Minh F",
    avgRating: 4.8,
    ratingCount: 75,
  },
];

interface CoursesPageProps {
  searchParams?: {
    q?: string;
    level?: string;
    price?: string;
    rating?: string;
  };
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const keyword = searchParams?.q?.trim() || "";
  const levelParam = searchParams?.level?.toLowerCase() || "all";
  const priceParam = searchParams?.price?.toLowerCase() || "all";
  const ratingParam = searchParams?.rating ? Number(searchParams.rating) : 0;

  // Gọi query từ tầng lib/queries/courses.ts (M1)
  let rawCourses: CourseCatalog[] = [];
  try {
    if (keyword || (levelParam && levelParam !== "all") || ratingParam > 0) {
      rawCourses = await searchCourses({
        keyword: keyword || undefined,
        level: levelParam !== "all" ? levelParam : undefined,
        minRating: ratingParam > 0 ? ratingParam : undefined,
      });
    } else {
      rawCourses = await getCourseCatalog();
    }
  } catch {
    rawCourses = [];
  }

  // Dùng dữ liệu fallback nếu database trống
  let courses = rawCourses.length > 0 ? rawCourses : FALLBACK_COURSES;

  // Lọc thêm theo giá và cấp độ (áp dụng cho cả dữ liệu DB lẫn fallback)
  if (keyword) {
    const lowerQ = keyword.toLowerCase();
    courses = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQ) ||
        c.description.toLowerCase().includes(lowerQ) ||
        c.instructorName.toLowerCase().includes(lowerQ),
    );
  }

  if (levelParam && levelParam !== "all") {
    courses = courses.filter((c) => c.level?.toLowerCase() === levelParam);
  }

  if (priceParam === "free") {
    courses = courses.filter((c) => c.price === 0);
  } else if (priceParam === "under500") {
    courses = courses.filter((c) => c.price > 0 && c.price <= 500000);
  } else if (priceParam === "above500") {
    courses = courses.filter((c) => c.price > 500000);
  }

  if (ratingParam > 0) {
    courses = courses.filter((c) => (c.avgRating ?? 0) >= ratingParam);
  }

  // Helper build URL cho bộ lọc
  function getFilterUrl(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    const current = {
      q: keyword || undefined,
      level: levelParam !== "all" ? levelParam : undefined,
      price: priceParam !== "all" ? priceParam : undefined,
      rating: ratingParam > 0 ? String(ratingParam) : undefined,
      ...overrides,
    };

    for (const [key, value] of Object.entries(current)) {
      if (value !== undefined && value !== "" && value !== "all") {
        params.set(key, String(value));
      }
    }

    const query = params.toString();
    return `/courses${query ? `?${query}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* HEADER & BREADCRUMB */}
        <div className="border-b border-border/50 bg-muted/20 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Link href="/" className="hover:text-foreground transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">Khám phá khóa học</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Tất cả khóa học
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Khám phá các chương trình đào tạo chất lượng cao với giảng viên hàng đầu
                </p>
              </div>

              {/* SEARCH BAR */}
              <form action="/courses" method="GET" className="relative w-full md:w-80">
                {levelParam !== "all" && <input type="hidden" name="level" value={levelParam} />}
                {priceParam !== "all" && <input type="hidden" name="price" value={priceParam} />}
                {ratingParam > 0 && <input type="hidden" name="rating" value={ratingParam} />}

                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  name="q"
                  defaultValue={keyword}
                  placeholder="Tìm tên khóa học, giảng viên..."
                  className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </form>
            </div>
          </div>
        </div>

        {/* CONTENT LAYOUT: SIDEBAR FILTERS + COURSES GRID */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* SIDEBAR BỘ LỌC */}
            <aside className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <span>Bộ lọc tìm kiếm</span>
                </div>
                {(keyword || levelParam !== "all" || priceParam !== "all" || ratingParam > 0) && (
                  <Link
                    href="/courses"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Đặt lại</span>
                  </Link>
                )}
              </div>

              {/* LỌC THEO CẤP ĐỘ */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trình độ
                </h3>
                <div className="flex flex-col gap-1.5 text-sm">
                  {[
                    { id: "all", label: "Tất cả trình độ" },
                    { id: "beginner", label: "Cơ bản (Người mới)" },
                    { id: "intermediate", label: "Trung cấp" },
                    { id: "advanced", label: "Nâng cao" },
                  ].map((lvl) => {
                    const isSelected = levelParam === lvl.id;
                    return (
                      <Link
                        key={lvl.id}
                        href={getFilterUrl({ level: lvl.id })}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {lvl.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* LỌC THEO GIÁ */}
              <div className="space-y-2.5 pt-4 border-t border-border/60">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Học phí
                </h3>
                <div className="flex flex-col gap-1.5 text-sm">
                  {[
                    { id: "all", label: "Tất cả mức giá" },
                    { id: "free", label: "Miễn phí" },
                    { id: "under500", label: "Dưới 500.000₫" },
                    { id: "above500", label: "Từ 500.000₫ trở lên" },
                  ].map((p) => {
                    const isSelected = priceParam === p.id;
                    return (
                      <Link
                        key={p.id}
                        href={getFilterUrl({ price: p.id })}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {p.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* LỌC THEO ĐÁNH GIÁ */}
              <div className="space-y-2.5 pt-4 border-t border-border/60">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Đánh giá sao
                </h3>
                <div className="flex flex-col gap-1.5 text-sm">
                  {[
                    { id: 0, label: "Tất cả đánh giá" },
                    { id: 4.5, label: "Từ 4.5 sao trở lên" },
                    { id: 4.0, label: "Từ 4.0 sao trở lên" },
                  ].map((r) => {
                    const isSelected = ratingParam === r.id;
                    return (
                      <Link
                        key={r.id}
                        href={getFilterUrl({ rating: r.id })}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {r.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* DANH SÁCH KHÓA HỌC */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/40 text-xs text-muted-foreground">
                <span>
                  Tìm thấy <strong className="text-foreground">{courses.length}</strong> khóa học
                  phù hợp
                </span>

                {keyword && (
                  <span>
                    Từ khóa: <strong className="text-primary">&quot;{keyword}&quot;</strong>
                  </span>
                )}
              </div>

              {courses.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              ) : (
                /* EMPTY STATE */
                <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <BookOpen className="h-6 w-6 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">
                      Không tìm thấy khóa học nào
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Hãy thử đổi từ khóa tìm kiếm hoặc bấm đặt lại bộ lọc để xem các khóa học khác.
                    </p>
                  </div>
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Xem lại toàn bộ khóa học</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
