import { createClient } from "@/lib/supabase/server";

export type InstructorCertificateRequest = {
  id: string;
  courseId: string;
  studentName: string | null;
  courseTitle: string | null;
  requestedAt: string;
  code: string;
  status: string;
};

export async function getInstructorCertificateCourses() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  let query = supabase.from("courses").select("id, title").order("title");
  if (userData.user?.id) query = query.eq("instructor_id", userData.user.id);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: String(row.id), title: String(row.title) }));
}

export async function getInstructorCertificateRequests(courseId?: string): Promise<InstructorCertificateRequest[]> {
  const supabase = createClient();
  let query = supabase
    .from("certificates")
    .select("id, code, issued_at, status, course_id, profiles(full_name), courses(title)")
    .order("issued_at", { ascending: false });
  if (courseId) query = query.eq("course_id", courseId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    courseId: String(row.course_id),
    code: String(row.code),
    requestedAt: String(row.issued_at),
    studentName: row.profiles?.full_name ?? null,
    courseTitle: row.courses?.title ?? null,
    status: String(row.status ?? "approved"),
  }));
}
