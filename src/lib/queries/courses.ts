import type { Course } from "@/types/domain";

// Chủ: M1. Truy vấn nội dung + coupon. (Gọi view/hàm ở migration 0004.)
// TODO(M1): điền thân, map snake_case → camelCase.

export interface CourseFilter {
  keyword?: string;
  categoryId?: string;
  level?: string;
  maxPrice?: number;
  minRating?: number;
}

export async function getCourseCatalog(): Promise<Course[]> {
  // TODO(M1): select from view_course_catalog
  throw new Error("TODO(M1): view_course_catalog chưa được hiện thực (migration 0004).");
}

export async function searchCourses(_filter: CourseFilter): Promise<Course[]> {
  // TODO(M1): supabase.rpc("fn_search_courses", { ... })
  throw new Error("TODO(M1): fn_search_courses chưa được hiện thực (migration 0004).");
}

export async function getCourseDetail(_slug: string) {
  // TODO(M1): select from view_course_detail + view_course_rating
  throw new Error("TODO(M1): view_course_detail chưa được hiện thực (migration 0004).");
}

export async function applyCoupon(_code: string, _courseIds: string[]): Promise<number> {
  // TODO(M1): supabase.rpc("fn_apply_coupon", { p_code, p_course_ids })
  throw new Error("TODO(M1): fn_apply_coupon chưa được hiện thực (migration 0004).");
}
