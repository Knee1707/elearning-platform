"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES, isAdminRole } from "@/lib/utils";
import type { CourseInput } from "./schema";

export type CategoryOption = { id: string; name: string };

export async function getCategories(): Promise<CategoryOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "khoa-hoc";

export async function createCourse(input: CourseInput): Promise<{ id: string }> {
  const profile = await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();
  const title = input.title.trim().replace(/\s+/g, " ");
  const normalizedTitle = title.toLowerCase();

  if (!title) throw new Error("Tên khóa học không được để trống.");

  // Kiểm tra các khóa đang nhìn thấy trước để báo lỗi thân thiện ngay trên form.
  // Unique index trong migration còn bảo vệ cả các khóa nháp của giảng viên khác.
  const { data: existingCourses, error: duplicateCheckError } = await supabase
    .from("courses")
    .select("id, title");
  if (duplicateCheckError) throw duplicateCheckError;
  if (
    existingCourses?.some(
      (course: { title: string }) => course.title.trim().replace(/\s+/g, " ").toLowerCase() === normalizedTitle,
    )
  ) {
    throw new Error("Tên khóa học đã tồn tại. Vui lòng chọn tên khác.");
  }

  const slug = `${slugify(input.title)}-${crypto.randomUUID().slice(0, 8)}`;
  const status = isAdminRole(profile.role) ? (input.status ?? "published") : "draft";

  const { data, error } = await supabase
    .from("courses")
    .insert({
      instructor_id: profile.id,
      category_id: input.categoryId,
      title,
      slug,
      description: input.description.trim(),
      level: input.level,
      price: input.price,
      status,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("Tên khóa học đã tồn tại. Vui lòng chọn tên khác.");
    }
    throw error;
  }

  // Revalidate toàn bộ các trang hiển thị khóa học công khai
  revalidatePath("/courses");
  revalidatePath("/");
  revalidatePath("/admin/courses");

  return { id: data.id };
}

/**
 * Quản trị viên xuất bản khóa học trực tiếp lên phần Khám phá khóa học
 */
export async function adminPublishCourseDirectly(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  await requireRole(ADMIN_ROLES);
  const supabase = createClient();

  const { error } = await supabase
    .from("courses")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", courseId);

  if (error) throw error;

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/edit`);
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/");
}

const editorPath = (courseId: string) => `/studio/${courseId}`;

export type AddLessonState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addChapter(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const supabase = createClient();
  const { data } = await supabase
    .from("chapters")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("chapters").insert({
    course_id: courseId,
    title: String(formData.get("title")).trim(),
    position: Number(data?.[0]?.position ?? 0) + 1,
  });
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}

export async function addLesson(
  _previousState: AddLessonState,
  formData: FormData,
): Promise<AddLessonState> {
  const courseId = String(formData.get("courseId") ?? "");
  const chapterId = String(formData.get("chapterId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const durationSeconds = Number(formData.get("durationSeconds") || 0);

  if (!courseId || !chapterId) return { status: "error", message: "Thiếu thông tin khóa học hoặc chương." };
  if (!title) return { status: "error", message: "Vui lòng nhập tên bài học." };
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return { status: "error", message: "Thời lượng phải là số giây không âm." };
  }

  try {
    await requireRole(["instructor", ...ADMIN_ROLES]);
    const supabase = createClient();
    const { data, error: positionError } = await supabase
      .from("lessons")
      .select("position")
      .eq("chapter_id", chapterId)
      .order("position", { ascending: false })
      .limit(1);
    if (positionError) throw positionError;

    // Kiểm tra xem khóa học cha có đang published không
    const { data: parentCourse } = await supabase
      .from("courses")
      .select("status")
      .eq("id", courseId)
      .maybeSingle();

    const isPublished = parentCourse?.status === "published";

    const { error } = await supabase.from("lessons").insert({
      chapter_id: chapterId,
      title,
      video_url: videoUrl || null,
      duration_seconds: durationSeconds,
      is_free: formData.get("isFree") === "on",
      position: Number(data?.[0]?.position ?? 0) + 1,
      content_review: isPublished ? "pending" : "approved",
      is_updated: isPublished,
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error("Tên khóa học đã tồn tại. Vui lòng chọn tên khác.");
      }
      throw error;
    }

    if (isPublished) {
      await supabase.from("courses").update({ update_status: "pending" }).eq("id", courseId);
    }

    revalidatePath(editorPath(courseId));
    return { status: "success", message: isPublished ? "Đã thêm bài học (đang chờ Admin duyệt)." : "Đã thêm bài học." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định từ máy chủ.";
    return { status: "error", message: `Không thể thêm bài học: ${message}` };
  }
}

export async function updateCourse(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const supabase = createClient();

  const { data: currentCourse } = await supabase
    .from("courses")
    .select("status")
    .eq("id", courseId)
    .single();

  const isPublished = currentCourse?.status === "published";

  const { error } = await supabase
    .from("courses")
    .update({
      title: String(formData.get("title")).trim(),
      description: String(formData.get("description")).trim(),
      price: Number(formData.get("price")),
      update_status: isPublished ? "pending" : "none",
    })
    .eq("id", courseId);
  if (error) throw error;
  revalidatePath(editorPath(courseId));
  revalidatePath("/studio");
}

export async function submitCourseUpdate(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();
  const { error } = await supabase.rpc("fn_submit_course_update", {
    p_course: courseId,
  });
  if (error) throw error;
  revalidatePath(editorPath(courseId));
  revalidatePath("/studio");
}

export async function submitForReview(formData: FormData) {
  const courseId = String(formData.get("courseId"));
  const profile = await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, instructor_id, status")
    .eq("id", courseId)
    .single();
  if (courseError) throw courseError;
  if (!course || (course.instructor_id !== profile.id && !isAdminRole(profile.role))) {
    throw new Error("Không có quyền thực hiện.");
  }
  if (!["draft", "rejected"].includes(String(course.status))) {
    throw new Error("Chỉ gửi duyệt được khi khóa đang ở trạng thái Nháp hoặc Bị từ chối.");
  }

  const { data: chapterRows } = await supabase.from("chapters").select("id").eq("course_id", courseId);
  const chapterIds = (chapterRows ?? []).map((row) => row.id);
  if (chapterIds.length === 0) throw new Error("Cần ít nhất 1 chương trước khi gửi duyệt.");

  const { count: lessonCount } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .in("chapter_id", chapterIds);
  if (!lessonCount) throw new Error("Cần ít nhất 1 bài học trước khi gửi duyệt.");

  const { error: updateError } = await supabase.from("courses").update({ status: "pending" }).eq("id", courseId);
  if (updateError) throw updateError;

  revalidatePath(editorPath(courseId));
  revalidatePath("/studio");
}
export async function updateChapterTitle(chapterId: string, courseId: string, title: string) {
  await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();
  const { error } = await supabase.from("chapters").update({ title: title.trim() }).eq("id", chapterId);
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}

export async function deleteChapter(chapterId: string, courseId: string) {
  await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();

  // Xóa bài học con trước (chưa có ON DELETE CASCADE xác nhận) — an toàn dù có cascade hay không.
  const { error: lessonsError } = await supabase.from("lessons").delete().eq("chapter_id", chapterId);
  if (lessonsError) throw lessonsError;

  const { error: chapterError } = await supabase.from("chapters").delete().eq("id", chapterId);
  if (chapterError) throw chapterError;

  revalidatePath(editorPath(courseId));
}

export async function updateLesson(
  lessonId: string,
  courseId: string,
  input: { title: string; videoUrl: string | null; durationSeconds: number; isFree: boolean },
) {
  await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();

  const { data: parentCourse } = await supabase
    .from("courses")
    .select("status")
    .eq("id", courseId)
    .maybeSingle();

  const isPublished = parentCourse?.status === "published";

  const { error } = await supabase
    .from("lessons")
    .update({
      title: input.title.trim(),
      video_url: input.videoUrl,
      duration_seconds: input.durationSeconds,
      is_free: input.isFree,
      content_review: isPublished ? "pending" : "approved",
      is_updated: isPublished,
    })
    .eq("id", lessonId);
  if (error) throw error;

  if (isPublished) {
    await supabase.from("courses").update({ update_status: "pending" }).eq("id", courseId);
  }

  revalidatePath(editorPath(courseId));
}

export async function deleteLesson(lessonId: string, courseId: string) {
  await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();
  // TODO: chưa xóa file video trong Storage lẫn quiz/questions liên kết (nếu có) — chỉ xóa dòng lessons.
  // Nếu DB báo lỗi ràng buộc khóa ngoại (questions.lesson_id → lessons.id), cần hỏi M2 cách xử lý.
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}
