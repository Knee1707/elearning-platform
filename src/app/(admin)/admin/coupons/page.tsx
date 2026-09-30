// src/app/(admin)/admin/coupons/page.tsx
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";

import { ADMIN_ROLES } from "@/lib/utils";

import { generatePayout } from "@/lib/queries/admin";

async function createCoupon(formData: FormData) {
  "use server";
  await requireRole(["admin"]);
  const supabase = createClient();

  const validFrom = String(formData.get("validFrom"));
  const validTo = formData.get("validTo") ? String(formData.get("validTo")) : null;

  const { error } = await supabase.from("coupon").insert({
    name: String(formData.get("name") ?? "").trim() || null,
    code: String(formData.get("code")).trim().toUpperCase(),
    type: String(formData.get("type")),
    value: Number(formData.get("value")),
    valid_from: new Date(validFrom).toISOString(),
    valid_to: validTo ? new Date(validTo).toISOString() : null,
    usage_limit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null,
  });
  if (error) throw error;
  revalidatePath("/admin/coupons");
}

function getCouponStatus(validFrom: string, validTo: string | null): { label: string; className: string } {
  const now = new Date();
  const from = new Date(validFrom);
  const to = validTo ? new Date(validTo) : null;

  if (now < from) {
    return { label: "Sắp diễn ra", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" };
  }
  if (to && now > to) {
    return { label: "Đã hết hạn", className: "bg-muted text-muted-foreground" };
  }
  return { label: "Đang hiệu lực", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };
}

const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function AdminCouponsPage() {

  await requireRole(ADMIN_ROLES);

  await requireRole(["admin"]);

  const supabase = createClient();
  const { data: coupons } = await supabase
    .from("coupon")
    .select("id, name, code, type, value, usage_limit, used_count, valid_from, valid_to")
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Mã giảm giá</h1>

      <div className="mt-6 max-w-2xl">
        <section className="rounded-lg border p-5">
          <h2 className="font-semibold">Tạo mã giảm giá</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Đặt tên chương trình để nhận diện theo sự kiện (VD: &quot;Ưu đãi khai giảng 2026&quot;).
          </p>

          <form action={createCoupon} className="mt-4 grid gap-3">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="name">
                Tên chương trình (không bắt buộc)
              </label>
              <input
                id="name"
                name="name"
                placeholder="Ưu đãi khai giảng 2026"
                className="mt-1 w-full rounded border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground" htmlFor="code">
                Mã code
              </label>
              <input
                id="code"
                name="code"
                required
                placeholder="KHAIGIANG2026"
                className="mt-1 w-full rounded border bg-background px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground" htmlFor="type">Loại giảm giá</label>
                <select id="type" name="type" className="mt-1 w-full rounded border bg-background px-3 py-2">
                  <option value="percent">Phần trăm</option>
                  <option value="fixed">Số tiền cố định</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground" htmlFor="value">Giá trị</label>
                <input
                  id="value"
                  name="value"
                  type="number"
                  min="1"
                  required
                  placeholder="20"
                  className="mt-1 w-full rounded border bg-background px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground" htmlFor="validFrom">Bắt đầu</label>
                <input
                  id="validFrom"
                  name="validFrom"
                  type="date"
                  required
                  defaultValue={today}
                  className="mt-1 w-full rounded border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground" htmlFor="validTo">
                  Kết thúc (để trống = không hết hạn)
                </label>
                <input
                  id="validTo"
                  name="validTo"
                  type="date"
                  className="mt-1 w-full rounded border bg-background px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground" htmlFor="usageLimit">
                Giới hạn lượt dùng (không bắt buộc)
              </label>
              <input
                id="usageLimit"
                name="usageLimit"
                type="number"
                min="1"
                placeholder="100"
                className="mt-1 w-full rounded border bg-background px-3 py-2"
              />
            </div>

            <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Tạo mã</button>
          </form>
        </section>



        <section className="rounded-lg border p-5">
          <h2 className="font-semibold">Tạo payout theo kỳ</h2>
          <form action={runPayout} className="mt-4 flex gap-3">
            <input name="period" type="month" required className="rounded border bg-background px-3 py-2" />
            <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Tạo payout</button>
          </form>
        </section>

      </div>

      <section className="mt-8">
        <h2 className="font-semibold">Mã đã tạo</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="p-3">Mã</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Giá trị</th>
                <th className="p-3">Hiệu lực</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Đã dùng</th>
              </tr>
            </thead>
            <tbody>
              {coupons?.map((coupon) => {
                const status = getCouponStatus(
                  String(coupon.valid_from),
                  coupon.valid_to ? String(coupon.valid_to) : null,
                );
                return (
                  <tr key={String(coupon.id)} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      {String(coupon.code)}
                      {coupon.name && (
                        <p className="mt-0.5 text-xs font-normal text-muted-foreground">{String(coupon.name)}</p>
                      )}
                    </td>
                    <td className="p-3">{coupon.type === "percent" ? "%" : "VNĐ"}</td>
                    <td className="p-3">{Number(coupon.value).toLocaleString("vi-VN")}</td>
                    <td className="p-3 text-muted-foreground">
                      {dateFmt.format(new Date(String(coupon.valid_from)))}
                      {coupon.valid_to
                        ? ` – ${dateFmt.format(new Date(String(coupon.valid_to)))}`
                        : " – Không hết hạn"}
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-3">
                      {Number(coupon.used_count)}
                      {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}