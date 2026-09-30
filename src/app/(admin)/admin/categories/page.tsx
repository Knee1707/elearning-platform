import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { getCategoriesAndTags, type TaxonomyRow } from "@/features/admin/queries";
import { deleteTaxonomyAction, saveTaxonomyAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, type SearchParams } from "@/features/admin/ui";

export default async function AdminCategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const { categories, tags } = await getCategoriesAndTags();

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader
        title="Danh mục & tag"
        description="Danh mục dùng để phân loại khóa học trên catalog; tag dùng cho tìm kiếm. Slug để trống sẽ tự tạo từ tên."
      />
      <FlashMessage searchParams={searchParams} />

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <TaxonomySection
          kind="categories"
          title="Danh mục"
          rows={categories}
          deleteHint="Xóa danh mục: các khóa học thuộc danh mục này chuyển thành “Chưa phân loại”."
        />
        <TaxonomySection kind="tag" title="Tag" rows={tags} deleteHint="Xóa tag: tag được gỡ khỏi mọi khóa học." />
      </div>
    </main>
  );
}

function TaxonomySection({
  kind,
  title,
  rows,
  deleteHint,
}: {
  kind: "categories" | "tag";
  title: string;
  rows: TaxonomyRow[];
  deleteHint: string;
}) {
  return (
    <section>
      <h2 className="font-semibold">
        {title} <span className="font-normal text-muted-foreground">({rows.length})</span>
      </h2>

      <form action={saveTaxonomyAction} className="mt-3 flex flex-wrap gap-2 rounded-lg border border-border p-3">
        <input type="hidden" name="kind" value={kind} />
        <input name="name" required maxLength={80} placeholder={`Tên ${title.toLowerCase()} mới`} aria-label={`Tên ${title.toLowerCase()} mới`} className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-2 text-sm" />
        <input name="slug" maxLength={80} placeholder="slug (tùy chọn)" aria-label="Slug" className="w-36 rounded border border-border bg-background px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Thêm</button>
      </form>

      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {rows.length ? (
          rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm">
              <form action={saveTaxonomyAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="id" value={row.id} />
                <input name="name" required defaultValue={row.name} maxLength={80} aria-label="Tên" className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 hover:border-border focus:border-border" />
                <input name="slug" defaultValue={row.slug} maxLength={80} aria-label="Slug" className="w-32 rounded border border-transparent bg-transparent px-2 py-1 font-mono text-xs text-muted-foreground hover:border-border focus:border-border" />
                <span className="w-16 text-right text-xs text-muted-foreground">{row.courseCount} khóa</span>
                <button type="submit" className="text-xs underline">Lưu</button>
              </form>
              <details className="group">
                <summary className="cursor-pointer list-none text-xs text-red-600 underline dark:text-red-400 [&::-webkit-details-marker]:hidden">Xóa</summary>
                <form action={deleteTaxonomyAction} className="mt-1">
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="id" value={row.id} />
                  <button type="submit" className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">
                    Xác nhận xóa{row.courseCount ? ` (${row.courseCount} khóa)` : ""}
                  </button>
                </form>
              </details>
            </li>
          ))
        ) : (
          <li className="px-3 py-3 text-sm text-muted-foreground">Chưa có {title.toLowerCase()} nào.</li>
        )}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{deleteHint}</p>
    </section>
  );
}
