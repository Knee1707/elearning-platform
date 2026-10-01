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
