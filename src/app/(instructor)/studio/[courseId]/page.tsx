import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { QuizAuthor } from "@/features/quiz/author/QuizAuthor";

type PageProps = { params: { courseId: string } };
const editorPath = (courseId: string) => `/studio/${courseId}`;

async function addChapter(formData: FormData) {
  "use server";
  const courseId = String(formData.get("courseId"));
  const supabase = createClient();
  const { data } = await supabase.from("chapters").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("chapters").insert({ course_id: courseId, title: String(formData.get("title")).trim(), position: Number(data?.[0]?.position ?? 0) + 1 });
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}

async function addLesson(formData: FormData) {
  "use server";
  const courseId = String(formData.get("courseId"));
  const chapterId = String(formData.get("chapterId"));
  const supabase = createClient();
  const { data } = await supabase.from("lessons").select("position").eq("chapter_id", chapterId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("lessons").insert({ chapter_id: chapterId, title: String(formData.get("title")).trim(), video_url: String(formData.get("videoUrl")).trim() || null, duration_seconds: Number(formData.get("durationSeconds") || 0), is_free: formData.get("isFree") === "on", position: Number(data?.[0]?.position ?? 0) + 1 });
  if (error) throw error;
  revalidatePath(editorPath(courseId));
}

async function updateCourse(formData: FormData) {
  "use server";
  const courseId = String(formData.get("courseId"));
  const supabase = createClient();
  const { error } = await supabase.from("courses").update({ title: String(formData.get("title")).trim(), description: String(formData.get("description")).trim(), price: Number(formData.get("price")), status: String(formData.get("status")) }).eq("id", courseId);
  if (error) throw error;
  revalidatePath(editorPath(courseId));
  revalidatePath("/studio");
}

export default async function EditCoursePage({ params }: PageProps) {
  const profile = await requireRole(["instructor", "admin"]);
  const supabase = createClient();
  const { data: course } = await supabase.from("courses").select("id, instructor_id, title, description, price, status, chapters(id, title, position, lessons(id, title, video_url, duration_seconds, is_free, position))").eq("id", params.courseId).single();
  if (!course || (course.instructor_id !== profile.id && profile.role !== "admin")) notFound();
  const chapters = (course.chapters ?? []) as Array<{ id: string; title: string; position: number; lessons: Array<{ id: string; title: string; video_url: string | null; duration_seconds: number; is_free: boolean; position: number }> }>;

  return <main className="mx-auto max-w-4xl p-8">
    <h1 className="text-2xl font-bold">Biên soạn khóa học</h1>
    <form action={updateCourse} className="mt-6 space-y-4 rounded-lg border p-5"><input type="hidden" name="courseId" value={String(course.id)} /><div><label className="text-sm font-medium" htmlFor="title">Tên khóa học</label><input id="title" name="title" defaultValue={String(course.title)} required className="mt-1 w-full rounded border bg-background px-3 py-2" /></div><div><label className="text-sm font-medium" htmlFor="description">Mô tả</label><textarea id="description" name="description" defaultValue={String(course.description)} required rows={4} className="mt-1 w-full rounded border bg-background px-3 py-2" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-medium" htmlFor="price">Giá (VNĐ)</label><input id="price" name="price" type="number" min="0" defaultValue={Number(course.price)} className="mt-1 w-full rounded border bg-background px-3 py-2" /></div><div><label className="text-sm font-medium" htmlFor="status">Trạng thái</label><select id="status" name="status" defaultValue={String(course.status)} className="mt-1 w-full rounded border bg-background px-3 py-2"><option value="draft">Nháp</option><option value="pending">Gửi duyệt</option></select></div></div><button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Lưu thay đổi</button></form>
    <section className="mt-8"><h2 className="text-xl font-semibold">Chương và bài học</h2><form action={addChapter} className="mt-4 flex gap-3"><input type="hidden" name="courseId" value={String(course.id)} /><input name="title" required placeholder="Tên chương mới" className="flex-1 rounded border bg-background px-3 py-2" /><button className="rounded border px-4 py-2 text-sm">Thêm chương</button></form><div className="mt-5 space-y-4">{chapters.sort((a, b) => a.position - b.position).map((chapter) => <article key={chapter.id} className="rounded-lg border p-4"><h3 className="font-semibold">{chapter.position}. {chapter.title}</h3><ul className="mt-3 space-y-2">{chapter.lessons.sort((a, b) => a.position - b.position).map((lesson) => <li key={lesson.id} className="rounded bg-muted/40 p-3"><div className="flex flex-wrap justify-between gap-2"><span>{lesson.position}. {lesson.title}{lesson.is_free ? " · Học thử" : ""}</span><span className="text-sm text-muted-foreground">{Math.round(lesson.duration_seconds / 60)} phút</span></div><details className="mt-3"><summary className="cursor-pointer text-sm underline">Soạn quiz</summary><div className="mt-3"><QuizAuthor lessonId={lesson.id} /></div></details></li>)}</ul><form action={addLesson} className="mt-4 grid gap-3 rounded bg-muted/30 p-3 sm:grid-cols-2"><input type="hidden" name="courseId" value={String(course.id)} /><input type="hidden" name="chapterId" value={chapter.id} /><input name="title" required placeholder="Tên bài học" className="rounded border bg-background px-3 py-2" /><input name="videoUrl" type="url" placeholder="URL video (tùy chọn)" className="rounded border bg-background px-3 py-2" /><input name="durationSeconds" type="number" min="0" placeholder="Thời lượng (giây)" className="rounded border bg-background px-3 py-2" /><label className="flex items-center gap-2 text-sm"><input name="isFree" type="checkbox" /> Cho học thử</label><button className="w-fit rounded border px-3 py-2 text-sm">Thêm bài học</button></form></article>)}</div></section>
  </main>;
}
