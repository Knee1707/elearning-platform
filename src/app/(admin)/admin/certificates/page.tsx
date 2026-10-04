import Link from "next/link";
import Image from "next/image";
import { Award, Calendar, ExternalLink, Filter, Folder, FolderCheck, GraduationCap, Search, User, X } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import {
  getCertificateCategories,
  getCertificateCourseOptions,
  getCertificates,
  getPendingCertificates,
} from "@/features/admin/queries";
import { reviewCertificateAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, buildHref, dateTime, param, type SearchParams } from "@/features/admin/ui";

export default async function AdminCertificatesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);

  const keyword = param(searchParams, "q") ?? "";
  const selectedCategory = param(searchParams, "category") ?? "all";
  const timeRange = param(searchParams, "timeRange") ?? "";
  const fromDate = param(searchParams, "from") ?? "";
  const toDate = param(searchParams, "to") ?? "";
  const courseId = param(searchParams, "courseId") ?? "";

  const [categories, courses, certificates, pending] = await Promise.all([
    getCertificateCategories(),
    getCertificateCourseOptions(),
    getCertificates({
      keyword,
      categoryId: selectedCategory,
      timeRange,
      fromDate,
      toDate,
      courseId: courseId || undefined,
    }),
    getPendingCertificates(courseId || undefined),
  ]);

  const totalAllCerts = categories.reduce((sum, c) => sum + c.count, 0);
  const activeCategoryObj = categories.find((c) => c.id === selectedCategory);
  const currentCategoryName =
    selectedCategory === "all"
      ? "Tất cả danh mục"
      : selectedCategory === "uncategorized"
        ? "Chưa phân loại"
        : (activeCategoryObj?.name ?? "Danh mục");

  const hasFilter = Boolean(keyword || (selectedCategory && selectedCategory !== "all") || timeRange || fromDate || toDate || courseId);

  const here = buildHref("/admin/certificates", {
    q: keyword || undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    timeRange: timeRange || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    courseId: courseId || undefined,
  });

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-8 space-y-8">
      <div>
        <PageHeader
          title="Quản lý Chứng chỉ"
          description="Danh sách các học viên đã hoàn thành khóa học và nhận được chứng chỉ theo từng danh mục. Hỗ trợ lọc chứng chỉ theo tên học viên, mã và thời gian cấp."
        />
        <FlashMessage searchParams={searchParams} />
      </div>

      {/* YÊU CẦU CẤP CHỨNG CHỈ CHỜ DUYỆT (NẾU CÓ) */}
      {pending.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-300">
              <Award className="h-4 w-4 text-amber-600" />
              Yêu cầu cấp chứng chỉ đang chờ duyệt
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                {pending.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-200/80 bg-white dark:border-amber-900/40 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="border-b bg-amber-50/50 dark:bg-amber-950/30 text-left text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3">Học viên</th>
                  <th className="p-3">Khóa học</th>
                  <th className="p-3">Ngày xin</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pending.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.studentName ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.courseTitle ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{dateTime.format(new Date(c.createdAt))}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <form action={reviewCertificateAction}>
                          <input type="hidden" name="certificateId" value={c.id} />
                          <input type="hidden" name="approve" value="true" />
                          <input type="hidden" name="returnTo" value={here} />
                          <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs">
                            Duyệt cấp
                          </button>
                        </form>
                        <form action={reviewCertificateAction}>
                          <input type="hidden" name="certificateId" value={c.id} />
                          <input type="hidden" name="approve" value="false" />
                          <input type="hidden" name="returnTo" value={here} />
                          <button className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40">
                            Từ chối
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* DANH SÁCH DANH MỤC (TABS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5 text-primary" />
            Danh mục chứng chỉ
          </h2>
          <span className="text-xs text-muted-foreground">
            Tổng cộng: <strong className="text-foreground">{totalAllCerts}</strong> học viên đã nhận chứng chỉ
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Tab Tất cả */}
          <Link
            href={buildHref("/admin/certificates", {
              category: "all",
              q: keyword || undefined,
              timeRange: timeRange || undefined,
              from: fromDate || undefined,
              to: toDate || undefined,
              courseId: courseId || undefined,
            })}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <FolderCheck className="h-3.5 w-3.5" />
            <span>Tất cả danh mục</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                selectedCategory === "all"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {totalAllCerts}
            </span>
          </Link>

          {/* Các tabs từng danh mục */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Link
                key={cat.id}
                href={buildHref("/admin/certificates", {
                  category: cat.id,
                  q: keyword || undefined,
                  timeRange: timeRange || undefined,
                  from: fromDate || undefined,
                  to: toDate || undefined,
                  courseId: courseId || undefined,
                })}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat.count}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* BỘ FILTER TRONG DANH MỤC */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-primary" />
            <span>Bộ lọc chứng chỉ học sinh</span>
            <span className="text-xs font-normal text-muted-foreground">
              (Đang lọc trong: <strong className="text-foreground">{currentCategoryName}</strong>)
            </span>
          </div>
          {hasFilter && (
            <Link
              href="/admin/certificates"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              <X className="h-3 w-3" />
              Đặt lại bộ lọc
            </Link>
          )}
        </div>

        <form method="GET" action="/admin/certificates" className="mt-4 space-y-4">
          <input type="hidden" name="category" value={selectedCategory} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Lọc theo Tên học viên hoặc Mã chứng chỉ */}
            <div className="lg:col-span-2">
              <label htmlFor="filter-q" className="mb-1 block text-xs font-medium text-muted-foreground">
                Tên học sinh hoặc Mã chứng chỉ
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="filter-q"
                  name="q"
                  defaultValue={keyword}
                  placeholder="Ví dụ: Nguyễn Văn A hoặc CERT-..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Lọc theo Khóa học */}
            <div>
              <label htmlFor="filter-course" className="mb-1 block text-xs font-medium text-muted-foreground">
                Khóa học
              </label>
              <select
                id="filter-course"
                name="courseId"
                defaultValue={courseId}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
              >
                <option value="">Tất cả khóa học</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc theo Mốc thời gian */}
            <div>
              <label htmlFor="filter-timerange" className="mb-1 block text-xs font-medium text-muted-foreground">
                Thời gian cấp
              </label>
              <select
                id="filter-timerange"
                name="timeRange"
                defaultValue={timeRange}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
              >
                <option value="">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày gần nhất</option>
                <option value="30d">30 ngày gần nhất</option>
                <option value="this_month">Trong tháng này</option>
                <option value="this_year">Trong năm nay</option>
                <option value="custom">Khoảng ngày tùy chọn</option>
              </select>
            </div>
          </div>

          {/* Chọn ngày cụ thể (Từ ngày - Đến ngày) */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Khoảng ngày cụ thể:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                name="from"
                defaultValue={fromDate}
                aria-label="Từ ngày"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-hidden"
              />
              <span className="text-xs text-muted-foreground">đến</span>
              <input
                type="date"
                name="to"
                defaultValue={toDate}
                aria-label="Đến ngày"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-hidden"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Áp dụng lọc</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* DANH SÁCH HỌC VIÊN ĐÃ NHẬN CHỨNG CHỈ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Học viên nhận chứng chỉ</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {certificates.length} học viên
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Danh mục: <strong>{currentCategoryName}</strong>
              {keyword && ` · Tìm kiếm: “${keyword}”`}
              {timeRange && ` · Thời gian: ${timeRange}`}
              {(fromDate || toDate) && ` · Từ ${fromDate || "đầu"} đến ${toDate || "nay"}`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3.5">Học viên</th>
                <th className="p-3.5">Khóa học &amp; Danh mục</th>
                <th className="p-3.5">Mã chứng chỉ</th>
                <th className="p-3.5">Thời gian cấp</th>
                <th className="p-3.5 text-right">Xem &amp; Xác thực</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificates.length > 0 ? (
                certificates.map((cert) => {
                  const initial = (cert.studentName || "U").charAt(0).toUpperCase();
                  return (
                    <tr key={cert.id} className="hover:bg-muted/30 transition-colors">
                      {/* Cột Học viên */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {cert.studentAvatar ? (
                            <Image
                              src={cert.studentAvatar}
                              alt={cert.studentName ?? "Avatar"}
                              width={32}
                              height={32}
                              unoptimized
                              className="h-8 w-8 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 text-primary flex items-center justify-center font-bold text-xs">
                              {initial}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/users/${cert.studentId}`}
                              className="font-semibold text-foreground hover:text-primary hover:underline flex items-center gap-1"
                            >
                              {cert.studentName ?? "Học viên chưa đặt tên"}
                            </Link>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ID: {cert.studentId.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột Khóa học & Danh mục */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground line-clamp-1">{cert.courseTitle ?? "—"}</p>
                          <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {cert.categoryName}
                          </span>
                        </div>
                      </td>

                      {/* Cột Mã chứng chỉ */}
                      <td className="p-3.5">
                        <a
                          href={`/verify/${cert.code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <span>{cert.code}</span>
                          <ExternalLink className="h-3 w-3 text-primary/70" />
                        </a>
                      </td>

                      {/* Cột Thời gian cấp */}
                      <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {dateTime.format(new Date(cert.issuedAt))}
                      </td>

                      {/* Cột Thao tác */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={`/verify/${cert.code}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-2xs"
                          >
                            <Award className="h-3.5 w-3.5 text-amber-600" />
                            <span>Chứng chỉ</span>
                          </a>
                          <Link
                            href={`/admin/users/${cert.studentId}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
                          >
                            <User className="h-3.5 w-3.5" />
                            <span>Hồ sơ</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="mx-auto max-w-sm space-y-2 text-center">
                      <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/60" />
                      <p className="text-sm font-semibold text-foreground">Không tìm thấy chứng chỉ nào</p>
                      <p className="text-xs text-muted-foreground">
                        Không có học viên nào nhận chứng chỉ trong danh mục này hoặc không khớp với bộ lọc hiện tại.
                      </p>
                      {hasFilter && (
                        <div className="pt-2">
                          <Link
                            href="/admin/certificates"
                            className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                          >
                            Xóa bộ lọc
                          </Link>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
