import { createClient } from "@/lib/supabase/server";
import type { Chapter, Course, Lesson } from "@/types/domain";

// Chủ: M1. Truy vấn nội dung + coupon. (Gọi view/hàm ở migration 0004.)
// đây là tầng service ,gọi view/hàm ở 0004,  
// //map dữ liệu từ database từ dạng snake_case sang camelCase, trả về cho tầng controller.
type DatabaseRow = Record<string, unknown>;

// khai báo interface CourseDetail mở rộng từ Course, thêm instructorName, chapters (mảng Chapter với lessons), avgRating, ratingCount
export interface CourseDetail extends Course {
  instructorName: string;
  chapters: Array<Chapter & { lessons: Lesson[] }>;
  avgRating: number;
  ratingCount: number;
}

export interface CourseCatalog extends Course {
  instructorName: string;
  avgRating: number;
  ratingCount: number;
}

// khai báo interface CourseFilter để lọc khoá học, với các trường keyword, categoryId, level, maxPrice, minRating
export interface CourseFilter {
  keyword?: string;
  categoryId?: string;
  level?: string;
  maxPrice?: number;
  minRating?: number;
}

// khai báo hàm truy vấn khoá học cho catalog

export async function getCourseCatalog(): Promise<CourseCatalog[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("view_course_catalog").select("*");
  if (error) throw error;
// nếu lỗi thì ném lỗi lên callter, phần phía trên sẽ xử lý
  return (data as DatabaseRow[]).map(mapCatalogCourse);
}

// khai báo hàm tìm kiếm khoá học theo filter, gọi hàm fn_search_courses trong supabase, map dữ liệu từ database sang camelCase
// property có ? dùng cho tuỳ chọn, nếu không có thì sẽ là undefined, khi gọi hàm fn_search_courses thì sẽ truyền null cho các property không có
export async function searchCourses(filter: CourseFilter): Promise<CourseCatalog[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_search_courses", {//rpc để gọi postgres
    p_keyword: filter.keyword ?? null,
    p_category: filter.categoryId ?? null,
    p_level: filter.level ?? null,
    p_max_price: filter.maxPrice ?? null,
    p_min_rating: filter.minRating ?? null,
  });
  if (error) throw error;

  return (data as DatabaseRow[]).map(mapCatalogCourse);
}

// khai báo hàm lấy thông tin chi tiết của từng khóa học (hỗ trợ cả slug lẫn UUID id)
export async function getCourseDetail(slugOrId: string): Promise<CourseDetail | null> {
  const supabase = createClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  let query = supabase.from("view_course_detail").select("*");
  if (isUuid) {
    query = query.eq("id", slugOrId);
  } else {
    query = query.eq("slug", slugOrId);
  }

  let { data, error } = await query.maybeSingle();
  if (error) throw error;

  // Nếu là UUID nhưng view_course_detail chưa tìm thấy theo id, thử tìm theo slug
  if (!data && isUuid) {
    const fallbackRes = await supabase
      .from("view_course_detail")
      .select("*")
      .eq("slug", slugOrId)
      .maybeSingle();
    data = fallbackRes.data;
  }

  if (!data) return null;

  const course = data as DatabaseRow;
  const { data: rating, error: ratingError } = await supabase
    .from("view_course_rating")
    .select("avg_rating, rating_count")
    .eq("course_id", course.id)
    .maybeSingle();
  if (ratingError) throw ratingError;

  return mapCourseDetail(course, (rating as DatabaseRow | null) ?? {});
}


// khai báo hàm applyCoupon, gọi hàm fn_apply_coupon trong supabase, trả về số tiền sau khi áp dụng coupon
export async function applyCoupon(code: string, courseIds: string[]): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_apply_coupon", {
    p_code: code,
    p_course_ids: courseIds,
  });
  if (error) throw error;
  return Number(data ?? 0);
}


// Lấy URL video của 1 bài học — gọi fn_get_lesson_video (kiểm quyền phía DB).
// Trả null nếu chưa đủ quyền (bài trả phí + chưa ghi danh) → UI hiện "Mua để xem".
export async function getLessonVideo(lessonId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_get_lesson_video", { p_lesson: lessonId });
  if (error) throw error;
  return typeof data === "string" ? data : null;
}

// Đổi đường dẫn video trong Storage thành signed URL để admin có thể xem thử.
// URL ngoài (YouTube/MP4/CDN...) được giữ nguyên.
export async function getLessonVideoPreviewUrl(lessonId: string): Promise<string | null> {
  const source = await getLessonVideo(lessonId);
  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return source;

  const supabase = createClient();
  const { data, error } = await supabase.storage.from("lesson-videos").createSignedUrl(source, 3600);
  if (error) throw error;
  return data?.signedUrl ?? null;
}


// Lấy URL tài liệu đính kèm — gọi fn_get_attachment (kiểm quyền phía DB).
// Trả null nếu chưa đủ quyền (tài liệu bài trả phí + chưa ghi danh).
export async function getAttachmentUrl(attachmentId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_get_attachment", { p_attachment: attachmentId });
  if (error) throw error;
  return typeof data === "string" ? data : null;
}

// Tạo URL tạm thời cho tài liệu private khi admin cần xem trước.
export async function getAttachmentPreviewUrl(attachmentId: string): Promise<string | null> {
  const source = await getAttachmentUrl(attachmentId);
  if (!source) return null;

  // Dữ liệu cũ lưu public URL tham chiếu; chuyển ngược về path Storage.
  const marker = "/storage/v1/object/public/lesson-attachments/";
  const path = source.includes(marker) ? decodeURIComponent(source.split(marker)[1]) : source;
  if (/^https?:\/\//i.test(path)) return path;

  const supabase = createClient();
  const { data, error } = await supabase.storage.from("lesson-attachments").createSignedUrl(path, 3600);
  if (error) throw error;
  return data?.signedUrl ?? null;
}


// khai báo hàm map dữ liệu catalog của khoá học từ database sang camelCase (object)
function mapCatalogCourse(row: DatabaseRow): CourseCatalog {
  return {
    id: String(row.id),
    instructorId: String(row.instructor_id ?? ""),
    categoryId: typeof row.category_id === "string" ? row.category_id : null,
    title: String(row.title),
    slug: String(row.slug),
    description: typeof row.description === "string" ? row.description : "",
    level: String(row.level),
    price: Number(row.price),
    status: (row.status as Course["status"] | undefined) ?? "published",
    thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    isFeatured: Boolean(row.is_featured),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    instructorName: String(row.instructor_name ?? ""),
    avgRating: Number(row.avg_rating ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
  };
}

// khai báo hàm map dữ liệu chi tiết của khoá học từ database sang camelCase, bao gồm instructorName, chapters, avgRating, ratingCount
function mapCourseDetail(row: DatabaseRow, rating: DatabaseRow): CourseDetail {
  const chapters = Array.isArray(row.chapters) ? row.chapters : [];

  return {
    ...mapCatalogCourse(row),
    instructorName: String(row.instructor_name ?? ""),
    chapters: chapters.map((chapter) => mapChapter(chapter as DatabaseRow)),
    avgRating: Number(rating.avg_rating ?? 0),
    ratingCount: Number(rating.rating_count ?? 0),
  };
}


// khai báo hàm map dữ liệu chapter từ database sang camelCase, bao gồm lessons
function mapChapter(row: DatabaseRow): Chapter & { lessons: Lesson[] } {
  const lessons = Array.isArray(row.lessons) ? row.lessons : [];

  return {
    id: String(row.id),
    courseId: String(row.course_id),
    title: String(row.title),
    position: Number(row.position),
    lessons: lessons.map((lesson) => mapLesson(lesson as DatabaseRow)),
  };
}

// khai báo hàm map dữ liệu lesson từ database sang camelCase
function mapLesson(row: DatabaseRow): Lesson {
  return {
    id: String(row.id),
    chapterId: String(row.chapter_id),
    title: String(row.title),
    videoUrl: typeof row.video_url === "string" ? row.video_url : null,
    videoStatus: String(row.video_status),
    durationSeconds: Number(row.duration_seconds),
    isFree: Boolean(row.is_free),
    position: Number(row.position),
  };
}
