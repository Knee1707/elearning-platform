import Link from "next/link";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { getPendingVideos } from "@/features/admin/queries";
import { getLessonVideo } from "@/lib/queries/courses";
import { reviewVideoAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, ReasonAction, type SearchParams } from "@/features/admin/ui";

// Duyệt video: giảng viên đăng/đổi video → chờ duyệt. Admin xem thử rồi
// duyệt (học viên mới xem được) hoặc từ chối kèm lý do (giảng viên nhận báo).
export default async function AdminVideoReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const pending = await getPendingVideos();

  // URL video để admin xem thử (fn_get_lesson_video trả URL cho admin ở mọi trạng thái).
  const withUrls = await Promise.all(
    pending.map(async (v) => ({ ...v, url: await getLessonVideo(v.lessonId).catch(() => null) })),
  );

  const here = "/admin/video-reviews";

  return (
    <main className="mx-auto max-w-4xl p-8">
      <PageHeader
        title="Duyệt video"
        description="Video giảng viên vừa đăng/đổi sẽ chờ duyệt ở đây. Học viên chỉ xem được sau khi bạn duyệt."
      />
      <FlashMessage searchParams={searchParams} />

      <p className="mt-4 text-sm text-muted-foreground">Đang chờ duyệt: <b>{withUrls.length}</b></p>

      <div className="mt-4 space-y-5">
        {withUrls.length ? (
          withUrls.map((v) => (
            <article key={v.lessonId} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium">{v.lessonTitle}{v.isFree ? " · Học thử" : ""}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Khóa:{" "}
                    <Link href={`/admin/courses/${v.courseId}/edit`} className="underline">
                      {v.courseTitle ?? "(không rõ)"}
                    </Link>{" "}
                    · GV: {v.instructorName ?? "không rõ"} · {Math.round(v.durationSeconds / 60)} phút
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <form action={reviewVideoAction}>
                    <input type="hidden" name="lessonId" value={v.lessonId} />
                    <input type="hidden" name="approve" value="true" />
                    <input type="hidden" name="returnTo" value={here} />
                    <button className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                      Duyệt
                    </button>
                  </form>
                  <ReasonAction
                    action={reviewVideoAction}
                    label="Từ chối"
                    submitLabel="Xác nhận từ chối"
                    placeholder="Lý do từ chối (giảng viên sẽ thấy)…"
                    hidden={{ lessonId: v.lessonId, approve: "false", returnTo: here }}
                  />
                </div>
              </div>

              <div className="mt-3">
                {v.url ? (
                  <video
                    controls
                    preload="metadata"
                    src={v.url}
                    className="max-h-[320px] w-full rounded-md border border-border bg-black"
                  />
                ) : (
                  <p className="rounded-md bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
                    Không tải được video xem thử (đường dẫn nội bộ hoặc thiếu quyền). Vẫn có thể duyệt/từ chối.
                  </p>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Không có video nào đang chờ duyệt. 🎉
          </p>
        )}
      </div>
    </main>
  );
}
