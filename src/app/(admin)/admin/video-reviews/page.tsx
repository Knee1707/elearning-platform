import Link from "next/link";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { getPendingVideos } from "@/features/admin/queries";
import { getAttachmentPreviewUrl, getLessonVideoPreviewUrl } from "@/lib/queries/courses";
import { reviewVideoAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, ReasonAction, type SearchParams } from "@/features/admin/ui";
import { getYouTubeEmbedUrl } from "@/lib/video";

// Duyệt video: giảng viên đăng/đổi video → chờ duyệt. Admin xem thử rồi
// duyệt (học viên mới xem được) hoặc từ chối kèm lý do (giảng viên nhận báo).
export default async function AdminVideoReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const pending = await getPendingVideos();

  // URL video để admin xem thử (fn_get_lesson_video trả URL cho admin ở mọi trạng thái).
  const withUrls = await Promise.all(
    pending.map(async (v) => ({
      ...v,
      url: await getLessonVideoPreviewUrl(v.lessonId).catch(() => null),
      attachments: await Promise.all(
        v.attachments.map(async (attachment) => ({
          ...attachment,
          url: await getAttachmentPreviewUrl(attachment.id).catch(() => null),
        })),
      ),
    })),
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
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    Lesson ID: {v.lessonId}
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
                {v.url && getYouTubeEmbedUrl(v.url) ? (
                  <iframe
                    title={`Xem trước ${v.lessonTitle}`}
                    src={getYouTubeEmbedUrl(v.url) ?? undefined}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="aspect-video w-full rounded-md border border-border bg-black"
                  />
                ) : v.url ? (
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

              <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
                <p className="font-medium">Thông tin giảng viên đã nhập</p>
                <dl className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                  <div><dt className="inline font-medium">Tên bài:</dt> <dd className="inline">{v.lessonTitle}</dd></div>
                  <div><dt className="inline font-medium">Thời lượng:</dt> <dd className="inline">{v.durationSeconds} giây</dd></div>
                  <div><dt className="inline font-medium">Học thử:</dt> <dd className="inline">{v.isFree ? "Có" : "Không"}</dd></div>
                  <div className="sm:col-span-2"><dt className="inline font-medium">URL nguồn:</dt> <dd className="inline break-all">{v.url ?? "Không lấy được URL"}</dd></div>
                </dl>
                {v.attachments.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium">Tài liệu đính kèm</p>
                    <ul className="mt-1 space-y-1">
                      {v.attachments.map((attachment) => (
                        <li key={attachment.id} className="flex flex-wrap items-center gap-2">
                          <span>{attachment.name}{attachment.type ? ` (${attachment.type})` : ""}</span>
                          {attachment.url ? (
                            <a href={attachment.url} target="_blank" rel="noreferrer" className="underline">Mở xem</a>
                          ) : (
                            <span className="text-muted-foreground">Không lấy được URL</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
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
