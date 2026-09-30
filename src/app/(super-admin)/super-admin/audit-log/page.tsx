import Link from "next/link";
import { AUDIT_PAGE_SIZE, getActivityLog } from "@/features/super-admin/queries";
import { ACTION_LABELS, ENTITY_LABELS, PageHeader, dateTime, describeActivity, param, type SearchParams } from "@/features/super-admin/ui";

export default async function SuperAdminAuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  const action = param(searchParams, "action");
  const entity = param(searchParams, "entity");
  const page = Math.max(1, Number(param(searchParams, "page")) || 1);
  const { entries, total } = await getActivityLog({
    page,
    action: action && action in ACTION_LABELS ? action : undefined,
    entity: entity && entity in ENTITY_LABELS ? entity : undefined,
  });
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (action) qs.set("action", action);
    if (entity) qs.set("entity", entity);
    qs.set("page", String(p));
    return `/super-admin/audit-log?${qs}`;
  };

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader title="Nhật ký hoạt động" description="Mọi thao tác quản trị (đổi vai trò, khóa, kiểm duyệt, hoàn tiền, payout, cấu hình). Chỉ đọc." />

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Hành động</span>
          <select name="action" defaultValue={action ?? ""} className="rounded border border-border bg-background px-3 py-2">
            <option value="">Tất cả</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Đối tượng</span>
          <select name="entity" defaultValue={entity ?? ""} className="rounded border border-border bg-background px-3 py-2">
            <option value="">Tất cả</option>
            {Object.entries(ENTITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Lọc</button>
        {(action || entity) && <Link href="/super-admin/audit-log" className="px-2 py-2 text-sm underline">Bỏ lọc</Link>}
      </form>

      <section className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="p-3">Thời gian</th>
              <th className="p-3">Người thực hiện</th>
              <th className="p-3">Hành động</th>
              <th className="p-3">Đối tượng</th>
              <th className="p-3">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {entries.length ? (
              entries.map((entry) => {
                const { label, detail } = describeActivity(entry);
                return (
                  <tr key={entry.id} className="border-b border-border align-top last:border-0">
                    <td className="whitespace-nowrap p-3 text-muted-foreground">{dateTime.format(new Date(entry.createdAt))}</td>
                    <td className="p-3">{entry.actorName ?? <span className="text-muted-foreground">Hệ thống</span>}</td>
                    <td className="p-3 font-medium">{label}</td>
                    <td className="p-3">
                      {entry.entity ? ENTITY_LABELS[entry.entity] ?? entry.entity : "—"}
                      {entry.entityId && <code className="ml-1 text-xs text-muted-foreground" title={entry.entityId}>{entry.entityId.slice(0, 8)}</code>}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {detail}
                      {entry.reason && <p className="mt-0.5">Lý do: {entry.reason}</p>}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-4 text-muted-foreground">Không có bản ghi nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Phân trang">
        <span className="text-muted-foreground">
          Trang {page}/{pageCount} · {total} bản ghi
        </span>
        <div className="flex gap-2">
          {page > 1 && <Link href={pageHref(page - 1)} className="rounded border border-border px-3 py-1.5 hover:bg-muted">Trước</Link>}
          {page < pageCount && <Link href={pageHref(page + 1)} className="rounded border border-border px-3 py-1.5 hover:bg-muted">Sau</Link>}
        </div>
      </nav>
    </main>
  );
}
