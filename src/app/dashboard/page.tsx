import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

// Route: /dashboard · Chủ: M4 · Tổng quan doanh thu + học viên cho giảng viên.
export default async function InstructorDashboardPage() {
  const profile = await requireRole(["instructor", ...ADMIN_ROLES]);
  const supabase = createClient();

  const { data: stats } = await supabase
    .from("view_instructor_stats")
    .select("student_count, revenue, completion_rate")
    .eq("instructor_id", profile.id)
    .maybeSingle();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, status")
    .eq("instructor_id", profile.id);

  const publishedCount = courses?.filter((c) => c.status === "published").length ?? 0;
  const draftCount = courses?.filter((c) => c.status === "draft").length ?? 0;
  const pendingCount = courses?.filter((c) => c.status === "pending").length ?? 0;

  const cards = [
    { label: "Học viên", value: String(stats?.student_count ?? 0) },
    { label: "Doanh thu (tổng)", value: money.format(Number(stats?.revenue ?? 0)) },
    { label: "Tỷ lệ hoàn thành bài học", value: `${stats?.completion_rate ?? 0}%` },
    { label: "Khóa đã publish", value: String(publishedCount) },
  ];

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Tổng quan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Số liệu tổng hợp trên toàn bộ khóa học của bạn.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">Nháp</p>
          <p className="mt-1 text-xl font-semibold">{draftCount}</p>
        </div>
        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">Chờ duyệt</p>
          <p className="mt-1 text-xl font-semibold">{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">Đã publish</p>
          <p className="mt-1 text-xl font-semibold">{publishedCount}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/studio" className="rounded border px-4 py-2 text-sm">
          Quản lý khóa học
        </Link>
      </div>
    </main>
  );
}