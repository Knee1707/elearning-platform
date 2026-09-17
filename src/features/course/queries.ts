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
  }));
}
