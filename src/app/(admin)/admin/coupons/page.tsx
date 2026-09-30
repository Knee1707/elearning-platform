// src/app/(admin)/admin/coupons/page.tsx
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { ADMIN_ROLES } from "@/lib/utils";
import { createCouponAction, disableCouponAction } from "@/features/admin/actions";
import { FlashMessage, PageHeader, type SearchParams } from "@/features/admin/ui";

type CouponState = "upcoming" | "expired" | "exhausted" | "active";

function getCouponStatus(validFrom: string, validTo: string | null, used: number, limit: number | null): { state: CouponState; label: string; className: string } {
  const now = new Date();
  if (now < new Date(validFrom)) {
    return { state: "upcoming", label: "Sắp diễn ra", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" };
  }
  if (validTo && now > new Date(validTo)) {
    return { state: "expired", label: "Đã hết hạn", className: "bg-muted text-muted-foreground" };
  }
  if (limit !== null && used >= limit) {
    return { state: "exhausted", label: "Hết lượt", className: "bg-muted text-muted-foreground" };
  }
  return { state: "active", label: "Đang hiệu lực", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };
}

const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const inputClass = "mt-1 w-full rounded border border-border bg-background px-3 py-2";

export default async function AdminCouponsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(ADMIN_ROLES);
  const supabase = createClient();
  // Gồm cả mã toàn hệ thống (instructor_id null) và mã do giảng viên tạo.
  const { data: coupons } = await supabase
    .from("coupon")
    .select("id, code, type, value, usage_limit, used_count, valid_from, valid_to, profiles(full_name)")
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <PageHeader title="Mã giảm giá" description="Mã do admin tạo áp dụng toàn hệ thống; mã của giảng viên chỉ áp dụng cho khóa của họ. Vô hiệu hóa sẽ kết thúc mã ngay lập tức." />
      <FlashMessage searchParams={searchParams} />

      <section className="mt-6 max-w-2xl rounded-lg border border-border p-5">
        <h2 className="font-semibold">Tạo mã giảm giá</h2>
        <form action={createCouponAction} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground" htmlFor="code">Mã code</label>
            <input id="code" name="code" required maxLength={32} pattern="[A-Za-z0-9_\-]{3,32}" placeholder="KHAIGIANG2026" className={`${inputClass} uppercase`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="type">Loại giảm giá</label>
              <select id="type" name="type" className={inputClass}>
                <option value="percent">Phần trăm</option>
                <option value="fixed">Số tiền cố định</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="value">Giá trị</label>
              <input id="value" name="value" type="number" min="1" required placeholder="20" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="validFrom">Bắt đầu</label>
              <input id="validFrom" name="validFrom" type="date" required defaultValue={today} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="validTo">Kết thúc (để trống = không hết hạn)</label>
              <input id="validTo" name="validTo" type="date" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground" htmlFor="usageLimit">Giới hạn lượt dùng (không bắt buộc)</label>
            <input id="usageLimit" name="usageLimit" type="number" min="1" placeholder="100" className={inputClass} />
          </div>

          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Tạo mã</button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Mã đã tạo</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr>
                <th className="p-3">Mã</th>
                <th className="p-3">Phạm vi</th>
                <th className="p-3">Giảm</th>
                <th className="p-3">Hiệu lực</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Đã dùng</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {coupons?.length ? (
                coupons.map((coupon) => {
                  const limit = coupon.usage_limit === null ? null : Number(coupon.usage_limit);
                  const ownerName = (coupon.profiles as unknown as { full_name?: string } | null)?.full_name;
                  const status = getCouponStatus(String(coupon.valid_from), coupon.valid_to ? String(coupon.valid_to) : null, Number(coupon.used_count), limit);
                  return (
                    <tr key={String(coupon.id)} className="border-b border-border last:border-0">
                      <td className="p-3 font-mono font-medium">{String(coupon.code)}</td>
                      <td className="p-3 text-muted-foreground">
                        {ownerName ? `GV ${ownerName}` : "Toàn hệ thống"}
                      </td>
                      <td className="p-3">
                        {coupon.type === "percent" ? `${Number(coupon.value)}%` : `${Number(coupon.value).toLocaleString("vi-VN")} ₫`}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {dateFmt.format(new Date(String(coupon.valid_from)))}
                        {coupon.valid_to ? ` – ${dateFmt.format(new Date(String(coupon.valid_to)))}` : " – Không hết hạn"}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="p-3 tabular-nums">
                        {Number(coupon.used_count)}
                        {limit !== null ? ` / ${limit}` : ""}
                      </td>
                      <td className="p-3">
                        {status.state === "active" || status.state === "upcoming" ? (
                          <form action={disableCouponAction}>
                            <input type="hidden" name="id" value={String(coupon.id)} />
                            <button type="submit" className="text-xs text-red-600 underline dark:text-red-400">Vô hiệu hóa</button>
                          </form>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7} className="p-4 text-muted-foreground">Chưa có mã giảm giá nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
