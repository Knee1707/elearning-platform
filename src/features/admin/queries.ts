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

// Yêu cầu cấp chứng chỉ đang chờ admin duyệt (status='pending').
export type PendingCertificate = {
  id: string;
  code: string;
  createdAt: string;
  studentName: string | null;
  courseTitle: string | null;
};

export async function getCertificateCourseOptions() {
  const supabase = createClient();
  const { data, error } = await supabase.from("courses").select("id, title").order("title");
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({ id: String(row.id), title: String(row.title) }));
}

export async function getPendingCertificates(courseId?: string): Promise<PendingCertificate[]> {
  const supabase = createClient();
  let query = supabase
    .from("certificates")
    .select("id, code, issued_at, profiles(full_name), courses(title)")
    .eq("status", "pending")
    .order("issued_at", { ascending: false });
  if (courseId) query = query.eq("course_id", courseId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: Row) => ({
    id: String(r.id),
    code: String(r.code),
    createdAt: String(r.issued_at),
    studentName: nameOf(r.profiles),
    courseTitle: titleOf(r.courses),
  }));
}

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
  attachments: Array<{ id: string; name: string; type: string | null }>;
};

export async function getPendingVideos(): Promise<PendingVideo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, title, duration_seconds, is_free, attachments(id, name, type), chapters!inner(course_id, courses!inner(id, title, profiles!courses_instructor_id_fkey(full_name)))",
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
      attachments: Array.isArray(row.attachments)
        ? row.attachments.map((attachment: Row) => ({
            id: String(attachment.id),
            name: String(attachment.name),
            type: typeof attachment.type === "string" ? attachment.type : null,
          }))
        : [],
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

export type ModerationRequestType = "create_course" | "update_video" | "update_content";

export interface ModerationCourseItem {
  id: string;
  courseId: string;
  courseTitle: string;
  status: CourseStatus;
  price: number;
  instructorName: string | null;
  categoryName: string | null;
  updatedAt: string;
  requestType: ModerationRequestType;
  requestLabel: string;
  targetLessonId?: string;
  targetLessonTitle?: string;
  videoUrl?: string | null;
  durationSeconds?: number;
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

  const courses = data ?? [];
  const courseIds = courses.map((c) => c.id);

  // Lấy danh sách nhiều giảng viên từ bảng course_instructors (nếu có)
  const instructorMap: Record<string, string[]> = {};
  if (courseIds.length > 0) {
    try {
      const { data: ciData } = await supabase
        .from("course_instructors")
        .select("course_id, profiles(full_name)")
        .in("course_id", courseIds);
      if (ciData) {
        for (const row of ciData as any[]) {
          const name = row.profiles?.full_name;
          if (name) {
            if (!instructorMap[row.course_id]) instructorMap[row.course_id] = [];
            if (!instructorMap[row.course_id].includes(name)) {
              instructorMap[row.course_id].push(name);
            }
          }
        }
      }
    } catch {
      // Graceful fallback nếu chưa có bảng
    }
  }

  return courses.map((row: Row) => {
    const defaultName = nameOf(row.profiles);
    const multiInstructors = instructorMap[String(row.id)];
    const instructorDisplayName = multiInstructors && multiInstructors.length > 0
      ? multiInstructors.join(", ")
      : defaultName;

    return {
      id: String(row.id),
      title: String(row.title),
      status: row.status as CourseStatus,
      price: Number(row.price),
      instructorName: instructorDisplayName,
      categoryName: ((row.categories as { name?: string } | null)?.name ?? null) || null,
      updatedAt: String(row.updated_at),
    };
  });
}

export async function getUnifiedCoursesForModeration(
  status: CourseStatus | "all",
  keyword = "",
): Promise<ModerationCourseItem[]> {
  const supabase = createClient();
  const cleaned = cleanKeyword(keyword).toLowerCase();

  if (status === "pending") {
    // 1. Khóa học mới chờ duyệt
    const coursesQuery = supabase
      .from("courses")
      .select("id, title, status, price, updated_at, profiles!courses_instructor_id_fkey(full_name), categories(name)")
      .eq("status", "pending")
      .order("updated_at", { ascending: true })
      .limit(100);

    // 2. Các bài học có video chờ duyệt
    const videosQuery = supabase
      .from("lessons")
      .select(
        "id, title, video_url, duration_seconds, is_free, video_review, chapters!inner(course_id, courses!inner(id, title, status, price, updated_at, profiles!courses_instructor_id_fkey(full_name), categories(name)))",
      )
      .eq("video_review", "pending")
      .order("id", { ascending: true })
      .limit(100);

    // 3. Các bài học có nội dung chờ duyệt hoặc is_updated = true
    const contentsQuery = supabase
      .from("lessons")
      .select(
        "id, title, content_review, is_updated, chapters!inner(course_id, courses!inner(id, title, status, price, updated_at, profiles!courses_instructor_id_fkey(full_name), categories(name)))",
      )
      .or("content_review.eq.pending,is_updated.eq.true")
      .neq("video_review", "pending")
      .order("id", { ascending: true })
      .limit(100);

    const [coursesRes, videosRes, contentsRes] = await Promise.all([
      coursesQuery,
      videosQuery,
      Promise.resolve(contentsQuery).catch(() => ({ data: [] as any[], error: null })),
    ]);

    if (coursesRes.error) throw coursesRes.error;
    if (videosRes.error) throw videosRes.error;

    const items: ModerationCourseItem[] = [];
    const pendingCourseIds = new Set<string>();

    // 1. Thêm các khóa học mới
    for (const row of (coursesRes.data ?? []) as Row[]) {
      const cId = String(row.id);
      pendingCourseIds.add(cId);
      items.push({
        id: cId,
        courseId: cId,
        courseTitle: String(row.title),
        status: "pending",
        price: Number(row.price),
        instructorName: nameOf(row.profiles),
        categoryName: ((row.categories as { name?: string } | null)?.name ?? null) || null,
        updatedAt: String(row.updated_at),
        requestType: "create_course",
        requestLabel: "Tạo khóa học",
      });
    }

    // 2. Thêm các bài học có video chờ duyệt (thuộc khóa đã publish / không pending cả khóa)
    for (const row of (videosRes.data ?? []) as Row[]) {
      const chapter = (row.chapters ?? {}) as Row;
      const course = (chapter.courses ?? {}) as Row;
      const cId = String(course.id ?? "");
      if (pendingCourseIds.has(cId)) continue;

      items.push({
        id: `video-${row.id}`,
        courseId: cId,
        courseTitle: String(course.title ?? "Khóa học"),
        status: (course.status as CourseStatus) ?? "published",
        price: Number(course.price ?? 0),
        instructorName: nameOf(course.profiles),
        categoryName: ((course.categories as { name?: string } | null)?.name ?? null) || null,
        updatedAt: String(course.updated_at ?? new Date().toISOString()),
        requestType: "update_video",
        requestLabel: "Chỉnh sửa video",
        targetLessonId: String(row.id),
        targetLessonTitle: String(row.title),
        videoUrl: typeof row.video_url === "string" ? row.video_url : null,
        durationSeconds: Number(row.duration_seconds ?? 0),
      });
    }

    // 3. Thêm các bài học cập nhật nội dung
    for (const row of (contentsRes.data ?? []) as Row[]) {
      const chapter = (row.chapters ?? {}) as Row;
      const course = (chapter.courses ?? {}) as Row;
      const cId = String(course.id ?? "");
      if (pendingCourseIds.has(cId)) continue;

      items.push({
        id: `content-${row.id}`,
        courseId: cId,
        courseTitle: String(course.title ?? "Khóa học"),
        status: (course.status as CourseStatus) ?? "published",
        price: Number(course.price ?? 0),
        instructorName: nameOf(course.profiles),
        categoryName: ((course.categories as { name?: string } | null)?.name ?? null) || null,
        updatedAt: String(course.updated_at ?? new Date().toISOString()),
        requestType: "update_content",
        requestLabel: "Update nội dung",
        targetLessonId: String(row.id),
        targetLessonTitle: String(row.title),
      });
    }

    if (cleaned) {
      return items.filter(
        (item) =>
          item.courseTitle.toLowerCase().includes(cleaned) ||
          (item.targetLessonTitle && item.targetLessonTitle.toLowerCase().includes(cleaned)) ||
          (item.instructorName && item.instructorName.toLowerCase().includes(cleaned)),
      );
    }

    return items;
  }

  // Các tab khác
  const courses = await getCoursesForModeration(status, keyword);
  return courses.map((course) => ({
    ...course,
    courseId: course.id,
    courseTitle: course.title,
    requestType: "create_course",
    requestLabel: course.status === "published" ? "Đang bán" : course.status === "hidden" ? "Đã ẩn" : course.status === "rejected" ? "Bị từ chối" : "Khóa học",
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
  revokedAt?: string | null;
  revokedReason?: string | null;
  studentId: string;
  studentName: string | null;
  studentAvatar?: string | null;
  courseId?: string;
  courseTitle: string | null;
  categoryId?: string | null;
  categoryName?: string;
  status: string;
}

export interface CertificateCategoryTab {
  id: string;
  name: string;
  slug: string;
  count: number;
}

// ------------------------------------------------------------------ //
// Quản lý học viên: danh sách, số khóa học, số tiền đã trả, lộ trình học
// ------------------------------------------------------------------ //
export interface StudentCourseRoadmapItem {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  status: EnrollmentStatus;
  purchasedAt: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

export interface StudentManagementItem {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  isBanned: boolean;
  createdAt: string;
  enrolledCount: number;
  totalSpent: number;
  completedCoursesCount: number;
  inProgressCoursesCount: number;
  roadmap: StudentCourseRoadmapItem[];
}

export async function getStudentOverallStats() {
  const supabase = createClient();
  const [studentsRes, enrollmentsRes, paymentsRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("enrollments").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("amount").eq("status", "paid"),
  ]);

  const totalSpentAll = (paymentsRes.data ?? []).reduce((sum: number, r: Row) => sum + Number(r.amount ?? 0), 0);

  return {
    totalStudents: studentsRes.count ?? 0,
    totalEnrollments: enrollmentsRes.count ?? 0,
    totalRevenue: totalSpentAll,
  };
}

export async function getStudentsManagement(filters: {
  keyword?: string;
  banned?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const supabase = createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? ADMIN_PAGE_SIZE;
  const cleaned = cleanKeyword(filters.keyword ?? "");

  let query = supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, is_banned, created_at", { count: "exact" })
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (cleaned) {
    query = query.ilike("full_name", `%${cleaned}%`);
  }
  if (filters.banned !== undefined) {
    query = query.eq("is_banned", filters.banned);
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: profiles, count, error } = await query;
  if (error) throw error;

  const studentIds = (profiles ?? []).map((p: Row) => String(p.id));

  if (!studentIds.length) {
    return { students: [], total: count ?? 0 };
  }

  // Lấy dữ liệu ghi danh, thanh toán, tiến độ bài học của các học viên này
  const [enrollmentsRes, paymentsRes, lessonProgressRes, lessonsRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, user_id, course_id, status, purchased_at, courses(id, title)")
      .in("user_id", studentIds)
      .order("purchased_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, user_id, course_id, amount, status")
      .in("user_id", studentIds)
      .eq("status", "paid"),
    supabase
      .from("lesson_progress")
      .select("user_id, lesson_id, is_completed")
      .in("user_id", studentIds),
    supabase
      .from("lessons")
      .select("id, chapters(course_id)"),
  ]);

  // Đếm tổng số bài học của từng khóa học
  const courseLessonsMap = new Map<string, number>();
  const lessonToCourseMap = new Map<string, string>();
  (lessonsRes.data ?? []).forEach((l: Row) => {
    const chapter = l.chapters as { course_id?: string } | null;
    const cId = chapter?.course_id ? String(chapter.course_id) : null;
    if (cId) {
      lessonToCourseMap.set(String(l.id), cId);
      courseLessonsMap.set(cId, (courseLessonsMap.get(cId) ?? 0) + 1);
    }
  });

  // Đếm số bài đã hoàn thành: studentId -> (courseId -> Set<lessonId>)
  const completedLessonsMap = new Map<string, Map<string, Set<string>>>();
  (lessonProgressRes.data ?? []).forEach((lp: Row) => {
    if (!lp.is_completed) return;
    const sId = String(lp.user_id);
    const lId = String(lp.lesson_id);
    const cId = lessonToCourseMap.get(lId);
    if (!cId) return;

    if (!completedLessonsMap.has(sId)) {
      completedLessonsMap.set(sId, new Map());
    }
    const studentCourses = completedLessonsMap.get(sId)!;
    if (!studentCourses.has(cId)) {
      studentCourses.set(cId, new Set());
    }
    studentCourses.get(cId)!.add(lId);
  });

  // Tổng tiền đã thanh toán của từng học viên
  const totalSpentMap = new Map<string, number>();
  (paymentsRes.data ?? []).forEach((pay: Row) => {
    const sId = String(pay.user_id);
    const amt = Number(pay.amount ?? 0);
    totalSpentMap.set(sId, (totalSpentMap.get(sId) ?? 0) + amt);
  });

  // Lộ trình học (các khóa học + tiến độ) của từng học viên
  const studentRoadmapMap = new Map<string, StudentCourseRoadmapItem[]>();
  (enrollmentsRes.data ?? []).forEach((enr: Row) => {
    const sId = String(enr.user_id);
    const cId = String(enr.course_id);
    const course = enr.courses as { id?: string; title?: string } | null;
    const courseTitle = course?.title ? String(course.title) : "Khóa học";

    const totalLessons = courseLessonsMap.get(cId) ?? 0;
    const completedSet = completedLessonsMap.get(sId)?.get(cId);
    const completedLessons = completedSet ? completedSet.size : 0;
    const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;

    const roadmapItem: StudentCourseRoadmapItem = {
      enrollmentId: String(enr.id),
      courseId: cId,
      courseTitle,
      status: (enr.status as EnrollmentStatus) ?? "active",
      purchasedAt: String(enr.purchased_at),
      totalLessons,
      completedLessons,
      progressPercent,
    };

    if (!studentRoadmapMap.has(sId)) {
      studentRoadmapMap.set(sId, []);
    }
    studentRoadmapMap.get(sId)!.push(roadmapItem);
  });

  // Kết hợp thành danh sách hoàn chỉnh
  const students: StudentManagementItem[] = (profiles ?? []).map((p: Row) => {
    const sId = String(p.id);
    const roadmap = studentRoadmapMap.get(sId) ?? [];
    const completedCoursesCount = roadmap.filter((r) => r.progressPercent === 100).length;
    const inProgressCoursesCount = roadmap.filter((r) => r.progressPercent > 0 && r.progressPercent < 100).length;

    return {
      id: sId,
      fullName: String(p.full_name || "Chưa đặt tên"),
      avatarUrl: (p.avatar_url as string | null) ?? null,
      role: (p.role as UserRole) ?? "student",
      isBanned: Boolean(p.is_banned),
      createdAt: String(p.created_at),
      enrolledCount: roadmap.length,
      totalSpent: totalSpentMap.get(sId) ?? 0,
      completedCoursesCount,
      inProgressCoursesCount,
      roadmap,
    };
  });

  return {
    students,
    total: count ?? 0,
  };
}

export type PendingDisciplineRequest = {
  id: string;
  enrollmentId: string;
  studentName: string | null;
  courseTitle: string | null;
  action: string;
  reason: string;
  createdAt: string;
};

export async function getPendingStudentDiscipline(): Promise<PendingDisciplineRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("student_discipline_request")
    // Bảng có 3 FK tới profiles (student_id, requested_by, reviewed_by) → phải chỉ rõ FK, nếu không PostgREST báo lỗi mơ hồ.
    .select("id, enrollment_id, action, reason, created_at, profiles!student_discipline_request_student_id_fkey(full_name), courses(title)")
    .eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Row) => ({
    id: String(row.id), enrollmentId: String(row.enrollment_id), studentName: nameOf(row.profiles), courseTitle: titleOf(row.courses),
    action: String(row.action), reason: String(row.reason), createdAt: String(row.created_at),
  }));
}

const CERT_SELECT = "id, code, issued_at, status, user_id, profiles!inner(full_name, avatar_url), courses!inner(id, title, category_id, categories(id, name, slug))";

const toCertificate = (row: Row): CertificateRow => {
  const course = row.courses as { id?: string; title?: string; category_id?: string; categories?: { id?: string; name?: string; slug?: string } | null } | null;
  const profile = row.profiles as { full_name?: string; avatar_url?: string } | null;
  return {
    id: String(row.id),
    code: String(row.code),
    issuedAt: String(row.issued_at),
    revokedAt: null,
    revokedReason: null,
    studentId: String(row.user_id),
    studentName: profile?.full_name ?? nameOf(row.profiles),
    studentAvatar: profile?.avatar_url ?? null,
    courseId: String(course?.id ?? ""),
    courseTitle: course?.title ?? titleOf(row.courses),
    categoryId: course?.category_id ? String(course.category_id) : null,
    categoryName: course?.categories?.name ?? "Chưa phân loại",
    status: String(row.status ?? "approved"),
  };
};

export async function getCertificateCategories(): Promise<CertificateCategoryTab[]> {
  const supabase = createClient();
  const [categoriesRes, certsRes] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase
      .from("certificates")
      .select("id, courses(category_id)")
      .is("revoked_at", null)
      .neq("status", "pending")
      .neq("status", "rejected"),
  ]);

  const certRows = (certsRes.data ?? []) as Row[];
  const countsByCat = new Map<string, number>();
  let uncategorizedCount = 0;

  for (const row of certRows) {
    const course = row.courses as { category_id?: string } | null;
    const catId = course?.category_id;
    if (catId) {
      countsByCat.set(catId, (countsByCat.get(catId) ?? 0) + 1);
    } else {
      uncategorizedCount++;
    }
  }

  const list: CertificateCategoryTab[] = ((categoriesRes.data ?? []) as Row[]).map((c: Row) => ({
    id: String(c.id),
    name: String(c.name),
    slug: String(c.slug),
    count: countsByCat.get(String(c.id)) ?? 0,
  }));

  if (uncategorizedCount > 0) {
    list.push({
      id: "uncategorized",
      name: "Chưa phân loại",
      slug: "uncategorized",
      count: uncategorizedCount,
    });
  }

  return list;
}


// Tìm học viên đã nhận chứng chỉ hợp lệ theo Danh mục, Tên học sinh, và Khoảng thời gian
export async function getCertificates(filters: {
  keyword?: string;
  categoryId?: string;
  timeRange?: string;
  fromDate?: string;
  toDate?: string;
  courseId?: string;
  revokedOnly?: boolean;
  sortBy?: "name" | "time";
  sortDir?: "asc" | "desc";
}) {
  const supabase = createClient();
  const cleaned = cleanKeyword(filters.keyword ?? "");
  const sortBy = filters.sortBy ?? "time";
  const sortDir = filters.sortDir ?? "desc";
  const sortRows = (rows: CertificateRow[]) => [...rows].sort((a, b) => {
    if (sortBy === "name") {
      const nameResult = (a.studentName ?? "").localeCompare(b.studentName ?? "", "vi", { sensitivity: "base" });
      if (nameResult !== 0) return sortDir === "asc" ? nameResult : -nameResult;
    }
    const timeResult = a.issuedAt.localeCompare(b.issuedAt);
    return sortDir === "asc" ? timeResult : -timeResult;
  });

  let dateFromIso: string | null = null;
  let dateToIso: string | null = null;

  const now = new Date();
  if (filters.timeRange === "today") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateFromIso = today.toISOString();
  } else if (filters.timeRange === "7d") {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFromIso = d.toISOString();
  } else if (filters.timeRange === "30d") {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFromIso = d.toISOString();
  } else if (filters.timeRange === "this_month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFromIso = d.toISOString();
  } else if (filters.timeRange === "this_year") {
    const d = new Date(now.getFullYear(), 0, 1);
    dateFromIso = d.toISOString();
  }

  if (filters.fromDate) {
    dateFromIso = new Date(`${filters.fromDate}T00:00:00.000Z`).toISOString();
  }
  if (filters.toDate) {
    dateToIso = new Date(`${filters.toDate}T23:59:59.999Z`).toISOString();
  }


  const base = () => {
    let q = supabase
      .from("certificates")
      .select(CERT_SELECT)
      .neq("status", "pending")
      .neq("status", "rejected")
      .order("issued_at", { ascending: false })
      .limit(100);

    if (filters.courseId) {
      q = q.eq("course_id", filters.courseId);
    }
    if (filters.revokedOnly) {
      q = q.not("revoked_at", "is", null);
    } else {
      q = q.is("revoked_at", null);
    }
    if (dateFromIso) {
      q = q.gte("issued_at", dateFromIso);
    }
    if (dateToIso) {
      q = q.lte("issued_at", dateToIso);
    }
    return q;
  };

  let rows: CertificateRow[] = [];
  if (!cleaned) {
    const { data, error } = await base();
    if (error) throw error;

    rows = (data ?? []).map(toCertificate);
  } else {
    const [byCode, byName] = await Promise.all([
      base().ilike("code", `%${cleaned}%`),
      base().ilike("profiles.full_name", `%${cleaned}%`),
    ]);
    if (byCode.error) throw byCode.error;
    if (byName.error) throw byName.error;
    const merged = new Map<string, CertificateRow>();
    for (const row of [...(byCode.data ?? []), ...(byName.data ?? [])]) merged.set(String(row.id), toCertificate(row));
    rows = [...merged.values()];
  }

  // Lọc theo Danh mục
  if (filters.categoryId && filters.categoryId !== "all") {
    if (filters.categoryId === "uncategorized") {
      rows = rows.filter((c) => !c.categoryId);
    } else {
      rows = rows.filter((c) => c.categoryId === filters.categoryId);
    }
  }

  return sortRows(rows);

}

