import Link from "next/link";
import { CornerDownRight, Search } from "lucide-react";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { QA_PAGE_SIZE, getQaThreads } from "@/features/admin/queries";
import { deleteQaAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, Pagination, ReasonAction, buildHref, dateTime, param, type SearchParams } from "@/features/admin/ui";

export default async function AdminQaPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const keyword = param(searchParams, "q") ?? "";
  const page = Math.max(1, Number(param(searchParams, "page")) || 1);
  const { threads, total } = await getQaThreads({ keyword, page });
  const pageCount = Math.max(1, Math.ceil(total / QA_PAGE_SIZE));
  const here = buildHref("/admin/qa", { q: keyword, page });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader
        title="Hỏi đáp (Q&A)"
        description="Gỡ câu hỏi hoặc câu trả lời vi phạm trong phần thảo luận bài học. Lý do bắt buộc và được gửi cho người viết; gỡ câu hỏi sẽ gỡ luôn các câu trả lời."
      />
      <FlashMessage searchParams={searchParams} />

      <form className="mt-6 flex flex-wrap items-center gap-2" role="search">
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={keyword} placeholder="Tìm trong nội dung câu hỏi…" aria-label="Tìm câu hỏi" className="w-72 rounded border border-border bg-background py-2 pl-9 pr-3 text-sm" />
        </span>
        <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Tìm</button>
        {keyword && <Link href="/admin/qa" className="px-2 text-sm underline">Bỏ lọc</Link>}
      </form>

      <div className="mt-6 space-y-4">
        {threads.length ? (
          threads.map((thread) => (
            <article key={thread.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {thread.courseTitle ?? "Khóa học"} · {thread.lessonTitle ?? "Bài học"}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm font-medium">{thread.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {thread.authorName ?? "Người dùng"} · {dateTime.format(new Date(thread.createdAt))}
                  </p>
                </div>
                <ReasonAction
                  action={deleteQaAction}
                  label="Gỡ câu hỏi"
                  submitLabel="Xác nhận gỡ"
                  placeholder="Lý do gỡ (người viết sẽ thấy)…"
                  hidden={{ entity: "question", id: thread.id, returnTo: here }}
                />
              </div>

              {thread.answers.length > 0 && (
                <ul className="mt-3 space-y-2 border-l-2 border-border pl-4">
                  {thread.answers.map((answer) => (
                    <li key={answer.id} className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-start gap-1.5 whitespace-pre-line text-sm">
                          <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {answer.content}
                        </p>
                        <p className="ml-5 text-xs text-muted-foreground">
                          {answer.authorName ?? "Người dùng"} · {dateTime.format(new Date(answer.createdAt))}
                        </p>
                      </div>
                      <ReasonAction
                        action={deleteQaAction}
                        label="Gỡ"
                        submitLabel="Xác nhận gỡ"
                        placeholder="Lý do gỡ (người viết sẽ thấy)…"
                        hidden={{ entity: "answer", id: answer.id, returnTo: here }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Không có câu hỏi nào{keyword ? ` khớp “${keyword}”` : ""}.</p>
        )}
      </div>

      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => buildHref("/admin/qa", { q: keyword, page: p })} />
    </main>
  );
}
