import { createClient } from "@/lib/supabase/server";
import type {
  CourseStatus,
  EnrollmentStatus,
  PaymentStatus,
  RefundStatus,
  ReportStatus,
  ReviewStatus,
  UserRole,
} from "@/types/domain";

// Truy vấn đọc cho khu Admin. Quyền đọc do RLS (fn_is_admin) quyết định.

type Row = Record<string, unknown>;
const nameOf = (rel: unknown) => ((rel as { full_name?: string } | null)?.full_name ?? null) || null;
const titleOf = (rel: unknown) => ((rel as { title?: string } | null)?.title ?? null) || null;
// Bỏ ký tự có nghĩa trong cú pháp lọc PostgREST trước khi đưa vào ilike.
const cleanKeyword = (keyword: string) => keyword.replace(/[%_,()*\\]/g, " ").trim();

export const ADMIN_PAGE_SIZE = 25;

// ------------------------------------------------------------------ //
// Duyệt video: các bài học đang chờ duyệt video (video_review = 'pending')
// ------------------------------------------------------------------ //
export type PendingVideo = {
  lessonId: string;
  lessonTitle: string;
  durationSeconds: number;
  isFree: boolean;
  courseId: string;
  courseTitle: string | null;
  instructorName: string | null;
};

export async function getPendingVideos(): Promise<PendingVideo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, title, duration_seconds, is_free, chapters!inner(course_id, courses!inner(id, title, profiles!courses_instructor_id_fkey(full_name)))",
    )
    .eq("video_review", "pending")
    .order("id", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row: Row) => {
    const chapter = (row.chapters ?? {}) as Row;
    const course = (chapter.courses ?? {}) as Row;
    return {
      lessonId: String(row.id),
      lessonTitle: String(row.title),
      durationSeconds: Number(row.duration_seconds ?? 0),
      isFree: Boolean(row.is_free),
      courseId: String(course.id ?? ""),
      courseTitle: titleOf(course),
      instructorName: nameOf(course.profiles),
    };
  });
}

// ------------------------------------------------------------------ //
// Dashboard: việc cần làm
// ------------------------------------------------------------------ //
export async function getAdminTodo() {
  const supabase = createClient();
  const head = { count: "exact" as const, head: true };
  const [courses, reports, reviews, refunds] = await Promise.all([
    supabase.from("courses").select("id", head).eq("status", "pending"),
    supabase.from("report").select("id", head).eq("status", "open"),
    supabase.from("reviews").select("id", head).eq("status", "pending"),
    supabase.from("refund").select("id", head).eq("status", "pending"),
  ]);
  return {
    pendingCourses: courses.count ?? 0,
    openReports: reports.count ?? 0,
    pendingReviews: reviews.count ?? 0,
    pendingRefunds: refunds.count ?? 0,
  };
}

// ------------------------------------------------------------------ //
// Khóa học
// ------------------------------------------------------------------ //
export interface ModerationCourse {
  id: string;
  title: string;
  status: CourseStatus;
  price: number;
  instructorName: string | null;
  categoryName: string | null;
  updatedAt: string;
}

export async function getCoursesForModeration(status: CourseStatus | "all", keyword = ""): Promise<ModerationCourse[]> {
  const supabase = createClient();
  let query = supabase
    .from("courses")
    .select("id, title, status, price, updated_at, profiles!courses_instructor_id_fkey(full_name), categories(name)")
    .order("updated_at", { ascending: status === "pending" })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);
  const cleaned = cleanKeyword(keyword);
  if (cleaned) query = query.ilike("title", `%${cleaned}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({
    id: String(row.id),
    title: String(row.title),
    status: row.status as CourseStatus,
    price: Number(row.price),
    instructorName: nameOf(row.profiles),
    categoryName: ((row.categories as { name?: string } | null)?.name ?? null) || null,
    updatedAt: String(row.updated_at),
  }));
}

// ------------------------------------------------------------------ //
// Người dùng
// ------------------------------------------------------------------ //
export interface UserRow {
  id: string;
  fullName: string;
  role: UserRole;
  isBanned: boolean;
  createdAt: string;
}

const toUser = (row: Row): UserRow => ({
  id: String(row.id),
  fullName: String(row.full_name ?? ""),
  role: row.role as UserRole,
  isBanned: Boolean(row.is_banned),
  createdAt: String(row.created_at),
});

export async function getUsers(filters: { keyword?: string; role?: UserRole; banned?: boolean; page?: number }) {
  const supabase = createClient();
  const page = filters.page ?? 1;
  let query = supabase
    .from("profiles")
    .select("id, full_name, role, is_banned, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  const cleaned = cleanKeyword(filters.keyword ?? "");
  if (cleaned) query = query.ilike("full_name", `%${cleaned}%`);
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.banned !== undefined) query = query.eq("is_banned", filters.banned);
  const { data, count, error } = await query;
  if (error) throw error;
  return { users: (data ?? []).map(toUser), total: count ?? 0 };
}

export async function getUserDetail(userId: string) {
  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_banned, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const [enrollments, payments, taught, reports] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, status, purchased_at, courses(title)")
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount, status, created_at, courses(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("courses")
      .select("id, title, status, price")
      .eq("instructor_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("report")
      .select("id, reason, status, created_at")
      .eq("entity", "user")
      .eq("entity_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    user: toUser(profile),
    enrollments: (enrollments.data ?? []).map((row: Row) => ({
      id: String(row.id),
      status: row.status as EnrollmentStatus,
      purchasedAt: String(row.purchased_at),
      courseTitle: titleOf(row.courses),
    })),
    payments: (payments.data ?? []).map((row: Row) => ({
      id: String(row.id),
      amount: Number(row.amount),
      status: row.status as PaymentStatus,
      createdAt: String(row.created_at),
      courseTitle: titleOf(row.courses),
    })),
    taughtCourses: (taught.data ?? []).map((row: Row) => ({
      id: String(row.id),
      title: String(row.title),
      status: row.status as CourseStatus,
      price: Number(row.price),
    })),
    reports: (reports.data ?? []).map((row: Row) => ({
      id: String(row.id),
      reason: (row.reason as string | null) ?? null,
      status: row.status as ReportStatus,
      createdAt: String(row.created_at),
    })),
  };
}

// ------------------------------------------------------------------ //
// Danh mục & tag
// ------------------------------------------------------------------ //
export interface TaxonomyRow {
  id: string;
  name: string;
  slug: string;
  courseCount: number;
}

export async function getCategoriesAndTags() {
  const supabase = createClient();
  const [categories, tags, courses, courseTags] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("tag").select("id, name, slug").order("name"),
    supabase.from("courses").select("category_id"),
    supabase.from("course_tag").select("tag_id"),
  ]);
  if (categories.error) throw categories.error;
  if (tags.error) throw tags.error;

  const count = (rows: Row[] | null, key: string) => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) {
      const id = row[key] as string | null;
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  };
  const byCategory = count(courses.data, "category_id");
  const byTag = count(courseTags.data, "tag_id");
  const toRow = (counts: Map<string, number>) => (row: Row): TaxonomyRow => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    courseCount: counts.get(String(row.id)) ?? 0,
  });
  return {
    categories: (categories.data ?? []).map(toRow(byCategory)),
    tags: (tags.data ?? []).map(toRow(byTag)),
  };
}

// ------------------------------------------------------------------ //
// Giao dịch
// ------------------------------------------------------------------ //
export interface PaymentRow {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  createdAt: string;
  studentName: string | null;
  courseTitle: string | null;
  couponCode: string | null;
}

// period dạng 'YYYY-MM' (lọc theo tháng, giờ UTC như fn_generate_payout).
export async function getPayments(filters: { status?: PaymentStatus; period?: string; page?: number }) {
  const supabase = createClient();
  const page = filters.page ?? 1;
  let query = supabase
    .from("payments")
    .select("id, amount, status, method, created_at, profiles(full_name), courses(title), coupon(code)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.period) {
    const [y, m] = filters.period.split("-").map(Number);
    query = query
      .gte("created_at", new Date(Date.UTC(y, m - 1, 1)).toISOString())
      .lt("created_at", new Date(Date.UTC(y, m, 1)).toISOString());
  }
  const { data, count, error } = await query;
  if (error) throw error;
  return {
    payments: (data ?? []).map(
      (row: Row): PaymentRow => ({
        id: String(row.id),
        amount: Number(row.amount),
        status: row.status as PaymentStatus,
        method: String(row.method),
        createdAt: String(row.created_at),
        studentName: nameOf(row.profiles),
        courseTitle: titleOf(row.courses),
        couponCode: ((row.coupon as { code?: string } | null)?.code ?? null) || null,
      }),
    ),
    total: count ?? 0,
  };
}

export async function getPendingRefunds() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("refund")
    .select("id, reason, status, created_at, payments(amount, courses(title), profiles(full_name))")
    .eq("status", "pending" satisfies RefundStatus)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row: Row) => {
    const payment = (row.payments as Row | null) ?? {};
    return {
      id: String(row.id),
      reason: (row.reason as string | null) ?? null,
      createdAt: String(row.created_at),
      amount: Number(payment.amount ?? 0),
      courseTitle: titleOf(payment.courses),
      studentName: nameOf(payment.profiles),
    };
  });
}

// ------------------------------------------------------------------ //
// Báo cáo & review
// ------------------------------------------------------------------ //
export interface ReportRow {
  id: string;
  entity: string;
  entityId: string;
  entityLabel: string | null;
  reason: string | null;
  status: ReportStatus;
  createdAt: string;
  reporterName: string | null;
}

export async function getReports(status: ReportStatus): Promise<ReportRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("report")
    .select("id, entity, entity_id, reason, status, created_at, profiles(full_name)")
    .eq("status", status)
    .order("created_at", { ascending: status !== "open" ? false : true })
    .limit(100);
  if (error) throw error;
  const rows = data ?? [];

  // Lấy tên đối tượng bị báo cáo (khóa học / người dùng / review) để admin nhận ra ngay.
  const idsOf = (entity: string) => rows.filter((r: Row) => r.entity === entity).map((r: Row) => String(r.entity_id));
  const [courses, users, reviews] = await Promise.all([
    idsOf("course").length ? supabase.from("courses").select("id, title").in("id", idsOf("course")) : { data: [] },
    idsOf("user").length ? supabase.from("profiles").select("id, full_name").in("id", idsOf("user")) : { data: [] },
    idsOf("review").length ? supabase.from("reviews").select("id, comment").in("id", idsOf("review")) : { data: [] },
  ]);
  const labels = new Map<string, string>();
  for (const c of (courses.data ?? []) as Row[]) labels.set(String(c.id), String(c.title));
  for (const u of (users.data ?? []) as Row[]) labels.set(String(u.id), String(u.full_name || "Chưa đặt tên"));
  for (const r of (reviews.data ?? []) as Row[]) labels.set(String(r.id), String(r.comment ?? "(review không có nội dung)"));

  return rows.map((row: Row) => ({
    id: String(row.id),
    entity: String(row.entity),
    entityId: String(row.entity_id),
    entityLabel: labels.get(String(row.entity_id)) ?? null,
    reason: (row.reason as string | null) ?? null,
    status: row.status as ReportStatus,
    createdAt: String(row.created_at),
    reporterName: nameOf(row.profiles),
  }));
}

export interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  courseTitle: string | null;
  authorName: string | null;
}

export async function getReviews(status: ReviewStatus): Promise<ReviewRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, status, created_at, courses(title), profiles(full_name)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({
    id: String(row.id),
    rating: Number(row.rating),
    comment: (row.comment as string | null) ?? null,
    status: row.status as ReviewStatus,
    createdAt: String(row.created_at),
    courseTitle: titleOf(row.courses),
    authorName: nameOf(row.profiles),
  }));
}

// ------------------------------------------------------------------ //
// Thông báo
// ------------------------------------------------------------------ //
export async function getPublishedCourseOptions() {
  const supabase = createClient();
  const { data, error } = await supabase.from("courses").select("id, title").eq("status", "published").order("title");
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({ id: String(row.id), title: String(row.title) }));
}

// ------------------------------------------------------------------ //
// Hỏi đáp (Q&A)
// ------------------------------------------------------------------ //
export interface QaAnswerRow {
  id: string;
  content: string;
  createdAt: string;
  authorName: string | null;
}

export interface QaThreadRow {
  id: string;
  content: string;
  createdAt: string;
  authorName: string | null;
  lessonTitle: string | null;
  courseTitle: string | null;
  answers: QaAnswerRow[];
}

export const QA_PAGE_SIZE = 20;

export async function getQaThreads(filters: { keyword?: string; page?: number }) {
  const supabase = createClient();
  const page = filters.page ?? 1;
  let query = supabase
    .from("qa_question")
    .select(
      "id, content, created_at, profiles(full_name), lessons(title, chapters(courses(title))), qa_answer(id, content, created_at, profiles(full_name))",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * QA_PAGE_SIZE, page * QA_PAGE_SIZE - 1);
  const cleaned = cleanKeyword(filters.keyword ?? "");
  if (cleaned) query = query.ilike("content", `%${cleaned}%`);
  const { data, count, error } = await query;
  if (error) throw error;
  const threads = (data ?? []).map((row: Row): QaThreadRow => {
    const lesson = row.lessons as { title?: string; chapters?: { courses?: { title?: string } | null } | null } | null;
    return {
      id: String(row.id),
      content: String(row.content),
      createdAt: String(row.created_at),
      authorName: nameOf(row.profiles),
      lessonTitle: lesson?.title ?? null,
      courseTitle: lesson?.chapters?.courses?.title ?? null,
      answers: ((row.qa_answer as Row[] | null) ?? [])
        .map((a) => ({ id: String(a.id), content: String(a.content), createdAt: String(a.created_at), authorName: nameOf(a.profiles) }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  });
  return { threads, total: count ?? 0 };
}

// ------------------------------------------------------------------ //
// Chứng chỉ
// ------------------------------------------------------------------ //
export interface CertificateRow {
  id: string;
  code: string;
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  studentId: string;
  studentName: string | null;
  courseTitle: string | null;
}

const CERT_SELECT = "id, code, issued_at, revoked_at, revoked_reason, user_id, profiles!inner(full_name), courses(title)";

const toCertificate = (row: Row): CertificateRow => ({
  id: String(row.id),
  code: String(row.code),
  issuedAt: String(row.issued_at),
  revokedAt: (row.revoked_at as string | null) ?? null,
  revokedReason: (row.revoked_reason as string | null) ?? null,
  studentId: String(row.user_id),
  studentName: nameOf(row.profiles),
  courseTitle: titleOf(row.courses),
});

// Tìm theo mã chứng chỉ HOẶC tên học viên; lọc đã thu hồi.
export async function getCertificates(filters: { keyword?: string; revokedOnly?: boolean }) {
  const supabase = createClient();
  const cleaned = cleanKeyword(filters.keyword ?? "");
  const base = () => {
    let q = supabase.from("certificates").select(CERT_SELECT).order("issued_at", { ascending: false }).limit(50);
    if (filters.revokedOnly) q = q.not("revoked_at", "is", null);
    return q;
  };
  if (!cleaned) {
    const { data, error } = await base();
    if (error) throw error;
    return (data ?? []).map(toCertificate);
  }
  const [byCode, byName] = await Promise.all([
    base().ilike("code", `%${cleaned}%`),
    base().ilike("profiles.full_name", `%${cleaned}%`),
  ]);
  if (byCode.error) throw byCode.error;
  if (byName.error) throw byName.error;
  const merged = new Map<string, CertificateRow>();
  for (const row of [...(byCode.data ?? []), ...(byName.data ?? [])]) merged.set(String(row.id), toCertificate(row));
  return [...merged.values()].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}
