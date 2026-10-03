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


// Lấy URL tài liệu đính kèm — gọi fn_get_attachment (kiểm quyền phía DB).
// Trả null nếu chưa đủ quyền (tài liệu bài trả phí + chưa ghi danh).
export async function getAttachmentUrl(attachmentId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_get_attachment", { p_attachment: attachmentId });
  if (error) throw error;
  return typeof data === "string" ? data : null;
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

// Nhóm danh mục chứa danh sách khóa học (mỗi danh mục hiển thị tối đa 3 thẻ ngang)
export interface CategoryGroup {
  id: string;
  name: string;
  slug: string;
  courses: CourseCatalog[];
}

export const FALLBACK_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "cat-python-web",
    name: "Python & Lập trình",
    slug: "lap-trinh-web",
    courses: [
      {
        id: "demo-course-py-1",
        instructorId: "demo-inst-1",
        categoryId: "cat-python-web",
        title: "Microsoft Python Development",
        slug: "lap-trinh-web-nextjs",
        description: "Khóa học lập trình Python toàn diện từ cơ bản đến xây dựng ứng dụng thực tế.",
        level: "beginner",
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
        id: "demo-course-py-2",
        instructorId: "demo-inst-1",
        categoryId: "cat-python-web",
        title: "Python for Everybody: Nhập môn đến chuyên sâu",
        slug: "nhap-mon-frontend",
        description: "Làm chủ cấu trúc dữ liệu, thuật toán và xử lý tự động hóa với Python.",
        level: "beginner",
        price: 0,
        status: "published",
        thumbnailUrl: null,
        isFeatured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        instructorName: "University of Michigan",
        avgRating: 4.9,
        ratingCount: 230,
      },
      {
        id: "demo-course-py-3",
        instructorId: "demo-inst-1",
        categoryId: "cat-python-web",
        title: "Khóa học Next.js 14 & TypeScript Thực chiến",
        slug: "nextjs-co-ban-nang-cao",
        description: "Xây dựng ứng dụng Web hiện đại chuẩn doanh nghiệp cùng Next.js và Supabase.",
        level: "intermediate",
        price: 599000,
        status: "published",
        thumbnailUrl: null,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        instructorName: "ThS. Nguyễn Văn A",
        avgRating: 5.0,
        ratingCount: 95,
      },
    ],
  },
  {
    id: "cat-data-analytics",
    name: "Data Analytics & AI",
    slug: "du-lieu-va-ai",
    courses: [
      {
        id: "demo-course-da-1",
        instructorId: "demo-inst-2",
        categoryId: "cat-data-analytics",
        title: "Google Data Analytics & Trực quan hóa dữ liệu",
        slug: "phan-tich-du-lieu-python",
        description: "Học quy trình chuẩn quốc tế về thu thập, làm sạch và phân tích dữ liệu cùng Google.",
        level: "intermediate",
        price: 699000,
        status: "published",
        thumbnailUrl: null,
        isFeatured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        instructorName: "Google",
        avgRating: 4.8,
        ratingCount: 180,
      },
      {
        id: "demo-course-da-2",
        instructorId: "demo-inst-2",
        categoryId: "cat-data-analytics",
        title: "Cơ sở dữ liệu PostgreSQL & Supabase Chuyên sâu",
        slug: "postgresql-supabase-chuyen-sau",
        description: "Làm chủ RLS, Stored Procedures, Triggers và kiến trúc bảo mật đa tầng.",
        level: "advanced",
        price: 399000,
        status: "published",
        thumbnailUrl: null,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        instructorName: "TS. Trần Thị B",
        avgRating: 4.8,
        ratingCount: 96,
      },
      {
        id: "demo-course-da-3",
        instructorId: "demo-inst-2",
        categoryId: "cat-data-analytics",
        title: "Excel & Power BI Skills for Business Analytics",
        slug: "nodejs-restful-api",
        description: "Trực quan hóa chỉ số kinh doanh và dashboard báo cáo tự động cho quản trị viên.",
        level: "beginner",
        price: 350000,
        status: "published",
        thumbnailUrl: null,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        instructorName: "Macquarie University",
        avgRating: 4.9,
        ratingCount: 112,
      },
    ],
  },
  {
    id: "cat-pm-devops",
    name: "Project Management & DevOps",
    slug: "ky-nang-nghe-nghiep",
    courses: [
      {
        id: "demo-course-pm-1",
        instructorId: "demo-inst-3",
        categoryId: "cat-pm-devops",
        title: "Microsoft Project Management: Job-Ready Skills",
        slug: "devops-docker-cicd",
        description: "Quản trị dự án công nghệ, vận hành Agile Scrum và kiểm soát tiến độ đội ngũ.",
        level: "intermediate",
        price: 600000,
        status: "published",
        thumbnailUrl: null,
        isFeatured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        instructorName: "Microsoft",
        avgRating: 4.6,
        ratingCount: 88,
      },
      {
        id: "demo-course-pm-2",
        instructorId: "demo-inst-3",
        categoryId: "cat-pm-devops",
        title: "Foundations of Agile Project Management",
        slug: "xay-dung-ung-dung-nextjs-thuc-chien",
        description: "Nền tảng quản lý dự án linh hoạt chuẩn đầu ra cho quản lý và trưởng nhóm kỹ thuật.",
        level: "beginner",
        price: 450000,
        status: "published",
        thumbnailUrl: null,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        instructorName: "Google",
        avgRating: 4.9,
        ratingCount: 160,
      },
      {
        id: "demo-course-pm-3",
        instructorId: "demo-inst-3",
        categoryId: "cat-pm-devops",
        title: "DevOps Thực Chiến: Docker, Kubernetes & CI/CD Pipeline",
        slug: "lap-trinh-flutter-dart",
        description: "Tự động hóa triển khai, giám sát hệ thống và tối ưu hóa quy trình release phần mềm.",
        level: "advanced",
        price: 550000,
        status: "published",
        thumbnailUrl: null,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        instructorName: "IBM Skills",
        avgRating: 4.8,
        ratingCount: 75,
      },
    ],
  },
];

// Lấy danh mục kèm tối đa 3 khóa học cho mỗi danh mục
export async function getCoursesByCategories(): Promise<CategoryGroup[]> {
  const supabase = createClient();
  try {
    const [categoriesRes, coursesRes] = await Promise.all([
      supabase.from("categories").select("id, name, slug").order("name"),
      getCourseCatalog(),
    ]);

    const categories = categoriesRes.data ?? [];
    const courses = coursesRes ?? [];

    if (categories.length > 0 && courses.length > 0) {
      const groups: CategoryGroup[] = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        courses: courses.filter((c) => c.categoryId === cat.id),
      }));

      // Phân bổ các khóa học chưa có category_id vào các nhóm còn thiếu
      const unassigned = courses.filter((c) => !categories.some((cat) => cat.id === c.categoryId));
      if (unassigned.length > 0) {
        let uIdx = 0;
        for (const g of groups) {
          while (g.courses.length < 3 && uIdx < unassigned.length) {
            g.courses.push(unassigned[uIdx++]);
          }
        }
      }

      // Giới hạn tối đa 3 khóa mỗi danh mục và lọc các danh mục có khóa
      const validGroups = groups
        .filter((g) => g.courses.length > 0)
        .map((g) => ({ ...g, courses: g.courses.slice(0, 3) }));

      if (validGroups.length > 0) {
        return validGroups;
      }
    }
  } catch {
    // Dùng fallback nếu DB lỗi hoặc trống
  }

  return FALLBACK_CATEGORY_GROUPS;
}
