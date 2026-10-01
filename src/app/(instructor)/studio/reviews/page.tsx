import { Star } from "lucide-react";
import { getInstructorReviews } from "@/features/course/queries";

const dt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
      ))}
    </span>
  );
}

export default async function StudioReviewsPage() {
  const reviews = await getInstructorReviews();
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Đánh giá khóa học của tôi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lượt đánh giá của học viên trên các khóa bạn phụ trách.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-white p-4">
        <span className="text-3xl font-black text-slate-900">{avg ? avg.toFixed(1) : "—"}</span>
        <div>
          {avg ? <Stars n={Math.round(avg)} /> : <span className="text-sm text-muted-foreground">Chưa có đánh giá</span>}
          <p className="text-xs text-muted-foreground">{reviews.length} lượt đánh giá</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {reviews.length ? (
          reviews.map((r) => (
            <article key={r.id} className="rounded-lg border border-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.studentName}</span>
                  <Stars n={r.rating} />
                </div>
                <span className="text-xs text-muted-foreground">{dt.format(new Date(r.createdAt))}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Khóa: {r.courseTitle}</p>
              {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Chưa có đánh giá nào cho khóa học của bạn.
          </p>
        )}
      </div>
    </main>
  );
}
