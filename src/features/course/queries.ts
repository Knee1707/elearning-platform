import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/types/domain";

export async function getMyCourses(): Promise<Course[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("instructor_id", userData.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((course) => ({
    id: course.id,
    instructorId: course.instructor_id,
    categoryId: course.category_id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    level: course.level,
    price: Number(course.price),
    status: course.status as Course["status"],
    thumbnailUrl: course.thumbnail_url,
    isFeatured: course.is_featured,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
    moderationNote: course.moderation_note ?? null,
  }));
}

export type InstructorStats = {
  totalCourses: number;
  publishedCourses: number;
  pendingCourses: number;
  totalStudents: number;
  avgRating: number | null;
};

// Tổng quan cho dashboard Giảng viên: số khóa, học viên, đánh giá trung bình.
export async function getInstructorStats(): Promise<InstructorStats> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { totalCourses: 0, publishedCourses: 0, pendingCourses: 0, totalStudents: 0, avgRating: null };

  const { data: courses } = await supabase
    .from("courses")
    .select("id, status")
    .eq("instructor_id", uid);
  const courseIds = (courses ?? []).map((c) => c.id as string);
  const totalCourses = courseIds.length;
  const publishedCourses = (courses ?? []).filter((c) => c.status === "published").length;
  const pendingCourses = (courses ?? []).filter((c) => c.status === "pending").length;

  let totalStudents = 0;
  let avgRating: number | null = null;
  if (courseIds.length) {
    const { count } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .in("course_id", courseIds)
      .eq("status", "active");
    totalStudents = count ?? 0;

    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .in("course_id", courseIds)
      .eq("status", "visible");
    if (reviews && reviews.length) {
      avgRating = reviews.reduce((s, r) => s + Number(r.rating ?? 0), 0) / reviews.length;
    }
  }

  return { totalCourses, publishedCourses, pendingCourses, totalStudents, avgRating };
}

export type ClassMember = {
  enrollmentId: string;
  userId: string;
  courseId: string;
  studentName: string;
  courseTitle: string;
  at: string;
  attendance: number;
  bestScore: number | null;
};

// Dữ liệu quản lý lớp cho giảng viên: yêu cầu chờ duyệt + học viên đang học
// kèm số buổi điểm danh và điểm thi cao nhất (RLS *_select_instructor cho phép đọc).
export async function getInstructorClassData(): Promise<{ pending: ClassMember[]; students: ClassMember[] }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { pending: [], students: [] };

  const { data: courses } = await supabase.from("courses").select("id, title").eq("instructor_id", uid);
  const courseTitle = new Map<string, string>((courses ?? []).map((c) => [c.id as string, c.title as string]));
  const courseIds = [...courseTitle.keys()];
  if (!courseIds.length) return { pending: [], students: [] };

  const { data: enrs } = await supabase
    .from("enrollments")
    .select("id, user_id, course_id, status, purchased_at, profiles(full_name)")
    .in("course_id", courseIds)
    .order("purchased_at", { ascending: false });

  // Số buổi điểm danh theo (học viên, khóa).
  const { data: att } = await supabase.from("attendance").select("user_id, course_id").in("course_id", courseIds);
  const attCount = new Map<string, number>();
  (att ?? []).forEach((a: any) => {
    const k = `${a.user_id}|${a.course_id}`;
    attCount.set(k, (attCount.get(k) ?? 0) + 1);
  });

  // Điểm thi cao nhất theo (học viên, khóa).
  const { data: exams } = await supabase.from("exams").select("id, course_id").in("course_id", courseIds);
  const examCourse = new Map<string, string>((exams ?? []).map((e: any) => [e.id, e.course_id]));
  const bestScore = new Map<string, number>();
  const examIds = [...examCourse.keys()];
  if (examIds.length) {
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select("user_id, exam_id, score")
      .in("exam_id", examIds)
      .not("score", "is", null);
    (attempts ?? []).forEach((a: any) => {
      const cid = examCourse.get(a.exam_id);
      if (!cid) return;
      const k = `${a.user_id}|${cid}`;
      bestScore.set(k, Math.max(bestScore.get(k) ?? 0, Number(a.score ?? 0)));
    });
  }

  const mapRow = (e: any): ClassMember => {
    const k = `${e.user_id}|${e.course_id}`;
    return {
      enrollmentId: e.id,
      userId: e.user_id,
      courseId: e.course_id,
      studentName: e.profiles?.full_name ?? "Học viên",
      courseTitle: courseTitle.get(e.course_id) ?? "",
      at: e.purchased_at,
      attendance: attCount.get(k) ?? 0,
      bestScore: bestScore.has(k) ? bestScore.get(k)! : null,
    };
  };

  return {
    pending: (enrs ?? []).filter((e: any) => e.status === "pending").map(mapRow),
    students: (enrs ?? []).filter((e: any) => e.status === "active").map(mapRow),
  };
}

export type InstructorReview = {
  id: string;
  rating: number;
  comment: string | null;
  courseTitle: string;
  studentName: string;
  createdAt: string;
};

// Lượt đánh giá (review) trên các khóa của giảng viên.
export async function getInstructorReviews(): Promise<InstructorReview[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data: courses } = await supabase.from("courses").select("id, title").eq("instructor_id", uid);
  const courseTitle = new Map<string, string>((courses ?? []).map((c) => [c.id as string, c.title as string]));
  const courseIds = [...courseTitle.keys()];
  if (!courseIds.length) return [];

  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, course_id, created_at, profiles(full_name)")
    .in("course_id", courseIds)
    .eq("status", "visible")
    .order("created_at", { ascending: false });

  return (data ?? []).map((r: any) => ({
    id: r.id,
    rating: Number(r.rating ?? 0),
    comment: r.comment ?? null,
    courseTitle: courseTitle.get(r.course_id) ?? "",
    studentName: r.profiles?.full_name ?? "Học viên",
    createdAt: r.created_at,
  }));
}
