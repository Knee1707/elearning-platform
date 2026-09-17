import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { moderateReview, resolveReport } from "@/lib/queries/admin";

async function handleReport(formData: FormData) {
  "use server";
  const kind = String(formData.get("kind"));
  if (kind === "report") await resolveReport(String(formData.get("id")), String(formData.get("status")) as "resolved" | "dismissed");
  if (kind === "review") await moderateReview(String(formData.get("id")), String(formData.get("status")) as "visible" | "hidden");
  revalidatePath("/admin/reports");
}

export default async function AdminReportsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const [{ data: reports }, { data: reviews }] = await Promise.all([
    supabase.from("report").select("id, entity, reason, created_at").eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("reviews").select("id, comment, rating, status, courses(title)").in("status", ["pending", "visible"]).order("created_at", { ascending: false }),
  ]);
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Báo cáo &amp; Kiểm duyệt review</h1>
      <section className="mt-6"><h2 className="text-lg font-semibold">Báo cáo đang mở</h2><div className="mt-3 space-y-3">{reports?.length ? reports.map((report) => <article key={String(report.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{String(report.entity)}</p><p className="text-sm text-muted-foreground">{String(report.reason)}</p></div><form action={handleReport} className="flex gap-2"><input type="hidden" name="kind" value="report" /><input type="hidden" name="id" value={String(report.id)} /><button name="status" value="resolved" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Đã xử lý</button><button name="status" value="dismissed" className="rounded border px-3 py-2 text-sm">Bỏ qua</button></form></article>) : <p className="text-sm text-muted-foreground">Không có báo cáo mở.</p>}</div></section>
      <section className="mt-8"><h2 className="text-lg font-semibold">Review</h2><div className="mt-3 space-y-3">{reviews?.length ? reviews.map((review) => <article key={String(review.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{String(review.rating)} / 5 · {String((review.courses as { title?: string } | null)?.title ?? "Khóa học")}</p><p className="text-sm text-muted-foreground">{String(review.comment ?? "Không có bình luận")}</p></div><form action={handleReport} className="flex gap-2"><input type="hidden" name="kind" value="review" /><input type="hidden" name="id" value={String(review.id)} /><button name="status" value="visible" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Hiện</button><button name="status" value="hidden" className="rounded border px-3 py-2 text-sm">Ẩn</button></form></article>) : <p className="text-sm text-muted-foreground">Chưa có review cần kiểm duyệt.</p>}</div></section>
    </main>
  );
}
