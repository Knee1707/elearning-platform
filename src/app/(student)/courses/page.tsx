import Link from "next/link";
import {
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { CourseCard } from "@/components/shared/CourseCard";
import {
  searchCourses,
  getCourseCatalog,
  type CourseCatalog,
} from "@/lib/queries/courses";

// Dữ liệu mẫu dự phòng khi database chưa có dữ liệu
const FALLBACK_COURSES: CourseCatalog[] = [
  {
    id: "demo-course-1",
    instructorId: "demo-inst-1",
    categoryId: "cat-python-web",
    title: "Microsoft Python Development",
    slug: "lap-trinh-web-nextjs",
    description: "Xây dựng ứng dụng web chuẩn Production từ cơ bản đến nâng cao cùng SSR, RLS và Server Actions.",
    level: "intermediate",
    price: 499000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "Microsoft",
    avgRating: 4.8,
    ratingCount: 142,
  },
  {
    id: "demo-course-2",
    instructorId: "demo-inst-2",
    categoryId: "cat-data-analytics",
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
    categoryId: "cat-python-web",
    title: "Python for Everybody: Nhập môn đến chuyên sâu",
    slug: "nhap-mon-frontend",
    description: "Khóa học miễn phí dành cho người mới bắt đầu muốn tạo dựng các trang web đẹp mắt và responsive.",
    level: "beginner",
    price: 0,
    status: "published",
    thumbnailUrl: null,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "University of Michigan",
    avgRating: 4.9,
    ratingCount: 215,
  },
  {
    id: "demo-course-4",
    instructorId: "demo-inst-4",
    categoryId: "cat-data-analytics",
    title: "Google Data Analytics & Trực quan hóa dữ liệu",
    slug: "nodejs-restful-api",
    description: "Thiết kế hệ thống Backend chịu tải cao, JWT Authentication, phân quyền và Docker hóa.",
    level: "intermediate",
    price: 350000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "Google",
    avgRating: 4.8,
    ratingCount: 88,
  },
  {
    id: "demo-course-5",
    instructorId: "demo-inst-5",
    categoryId: "cat-pm-devops",
    title: "Microsoft Project Management: Job-Ready Skills",
    slug: "lap-trinh-flutter-dart",
    description: "Phát triển ứng dụng iOS và Android từ một cơ sở mã nguồn duy nhất với hiệu năng đỉnh cao.",
    level: "beginner",
    price: 550000,
    status: "published",
    thumbnailUrl: null,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructorName: "Microsoft",
    avgRating: 4.6,
    ratingCount: 110,
  },
  {
    id: "demo-course-6",
    instructorId: "demo-inst-6",
    categoryId: "cat-pm-devops",
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
    instructorName: "IBM Skills",
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
    category?: string;
  };
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const keyword = searchParams?.q?.trim() || "";
  const levelParam = searchParams?.level?.toLowerCase() || "all";
  const priceParam = searchParams?.price?.toLowerCase() || "all";
  const ratingParam = searchParams?.rating ? Number(searchParams.rating) : 0;
  const categoryParam = searchParams?.category?.toLowerCase() || "all";


  // Gọi query từ tầng lib/queries/courses.ts
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

  // Lọc theo từ khóa
  if (keyword) {
    const lowerQ = keyword.toLowerCase();
    courses = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQ) ||
        c.description.toLowerCase().includes(lowerQ) ||
        c.instructorName.toLowerCase().includes(lowerQ),
    );
  }

  // Lọc theo cấp độ
  if (levelParam && levelParam !== "all") {
    courses = courses.filter((c) => c.level?.toLowerCase() === levelParam);
  }

  // Lọc theo danh mục
  if (categoryParam && categoryParam !== "all") {
    courses = courses.filter((c) => {
      if (categoryParam === "lap-trinh-web") {
        return (
          c.categoryId === "cat-python-web" ||
          c.title.toLowerCase().includes("python") ||
          c.title.toLowerCase().includes("next.js") ||
          c.title.toLowerCase().includes("web")
        );
      }
      if (categoryParam === "du-lieu-va-ai") {
        return (
          c.categoryId === "cat-data-analytics" ||
          c.title.toLowerCase().includes("data") ||
          c.title.toLowerCase().includes("sql") ||
          c.title.toLowerCase().includes("dữ liệu")
        );
      }
      if (categoryParam === "ky-nang-nghe-nghiep") {
        return (
          c.categoryId === "cat-pm-devops" ||
          c.title.toLowerCase().includes("management") ||
          c.title.toLowerCase().includes("quản lý") ||
          c.title.toLowerCase().includes("devops")
        );
      }
      return c.categoryId === categoryParam;
    });
  }

  // Lọc theo mức giá
  if (priceParam === "free") {
    courses = courses.filter((c) => c.price === 0);
  } else if (priceParam === "under500") {
    courses = courses.filter((c) => c.price > 0 && c.price <= 500000);
  } else if (priceParam === "above500") {
    courses = courses.filter((c) => c.price > 500000);
  }

  // Lọc theo số sao
  if (ratingParam > 0) {
    courses = courses.filter((c) => (c.avgRating ?? 0) >= ratingParam);
  }

  // Kiểm tra người dùng có đang áp dụng bộ lọc/tìm kiếm hay không
  const isFiltering =
    Boolean(keyword) ||
    levelParam !== "all" ||
    priceParam !== "all" ||
    ratingParam > 0 ||
    categoryParam !== "all";

  // Helper build URL cho bộ lọc
  function getFilterUrl(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    const current = {
      q: keyword || undefined,
      level: levelParam !== "all" ? levelParam : undefined,
      price: priceParam !== "all" ? priceParam : undefined,
      rating: ratingParam > 0 ? String(ratingParam) : undefined,
      category: categoryParam !== "all" ? categoryParam : undefined,
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-16">
        {/* HEADER & BREADCRUMB */}
        <div className="border-b border-slate-200 bg-white py-8 shadow-xs">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
              <Link href="/" className="hover:text-blue-600 transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-800 font-semibold">Khám phá khóa học</span>
            </div>

            <div className="max-w-4xl space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                Thư viện Khóa học Thực chiến
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
                Hơn 50+ khóa học công nghệ chuẩn đầu ra với giáo trình tương tác thực chiến
              </p>
            </div>
          </div>
        </div>

        {/* CONTENT LAYOUT: SIDEBAR FILTERS + COURSES */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* SIDEBAR BỘ LỌC */}
            <aside className="space-y-6">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>Bộ lọc tìm kiếm</span>
                  </div>
                  {isFiltering && (
                    <Link
                      href="/courses"
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Đặt lại</span>
                    </Link>
                  )}
                </div>

                {/* LỌC THEO DANH MỤC */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Danh mục khóa học
                  </h3>
                  <div className="flex flex-col gap-1 text-xs">
                    {[
                      { id: "all", label: "Tất cả danh mục" },
                      { id: "lap-trinh-web", label: "Python & Lập trình" },
                      { id: "du-lieu-va-ai", label: "Data Analytics & AI" },
                      { id: "ky-nang-nghe-nghiep", label: "Project Management & DevOps" },
                    ].map((cat) => {
                      const isSelected = categoryParam === cat.id;
                      return (
                        <Link
                          key={cat.id}
                          href={getFilterUrl({ category: cat.id })}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-blue-50 text-blue-600 shadow-xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {cat.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* LỌC THEO CẤP ĐỘ */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Trình độ học
                  </h3>
                  <div className="flex flex-col gap-1 text-xs">
                    {[
                      { id: "all", label: "Tất cả trình độ" },
                      { id: "beginner", label: "Cơ bản (Cho người mới)" },
                      { id: "intermediate", label: "Trung cấp (Đã có nền tảng)" },
                      { id: "advanced", label: "Nâng cao (Chuyên sâu)" },
                    ].map((lvl) => {
                      const isSelected = levelParam === lvl.id;
                      return (
                        <Link
                          key={lvl.id}
                          href={getFilterUrl({ level: lvl.id })}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-blue-50 text-blue-600 shadow-xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {lvl.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* LỌC THEO GIÁ */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Mức học phí
                  </h3>
                  <div className="flex flex-col gap-1 text-xs">
                    {[
                      { id: "all", label: "Tất cả mức giá" },
                      { id: "free", label: "Khóa học Miễn phí" },
                      { id: "under500", label: "Dưới 500.000₫" },
                      { id: "above500", label: "Từ 500.000₫ trở lên" },
                    ].map((p) => {
                      const isSelected = priceParam === p.id;
                      return (
                        <Link
                          key={p.id}
                          href={getFilterUrl({ price: p.id })}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-blue-50 text-blue-600 shadow-xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {p.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* LỌC THEO ĐÁNH GIÁ */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Đánh giá sao
                  </h3>
                  <div className="flex flex-col gap-1 text-xs">
                    {[
                      { id: 0, label: "Tất cả đánh giá" },
                      { id: 4.5, label: "★ Từ 4.5 sao trở lên" },
                      { id: 4.0, label: "★ Từ 4.0 sao trở lên" },
                    ].map((r) => {
                      const isSelected = ratingParam === r.id;
                      return (
                        <Link
                          key={r.id}
                          href={getFilterUrl({ rating: r.id })}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-blue-50 text-blue-600 shadow-xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {r.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>

            {/* DANH SÁCH KHÓA HỌC */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80 text-xs text-slate-500">
                <span>
                  Tìm thấy <strong className="text-slate-900 font-bold">{courses.length}</strong> khóa học phù hợp
                </span>

                {keyword && (
                  <span>
                    Từ khóa: <strong className="text-blue-600 font-bold">&quot;{keyword}&quot;</strong>
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
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Không tìm thấy khóa học nào phù hợp
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Hãy thử đổi từ khóa tìm kiếm hoặc bấm đặt lại bộ lọc để xem danh sách toàn bộ khóa học.
                    </p>
                  </div>
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Xem lại tất cả khóa học</span>
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
