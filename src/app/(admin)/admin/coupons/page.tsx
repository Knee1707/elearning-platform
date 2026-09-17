import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/queries/auth";
import { generatePayout } from "@/lib/queries/admin";

async function createCoupon(formData: FormData) {
  "use server";
  await requireRole(["admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("coupon").insert({ code: String(formData.get("code")).trim().toUpperCase(), type: String(formData.get("type")), value: Number(formData.get("value")), valid_from: new Date().toISOString(), usage_limit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null });
  if (error) throw error;
  revalidatePath("/admin/coupons");
}

async function runPayout(formData: FormData) {
  "use server";
  await generatePayout(String(formData.get("period")));
  revalidatePath("/admin/coupons");
}

export default async function AdminCouponsPage() {
  await requireRole(["admin"]);
  const supabase = createClient();
  const { data: coupons } = await supabase.from("coupon").select("id, code, type, value, usage_limit, used_count, valid_to").order("created_at", { ascending: false });
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Mã giảm giá &amp; Payout</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-lg border p-5"><h2 className="font-semibold">Tạo mã giảm giá</h2><form action={createCoupon} className="mt-4 grid gap-3"><input name="code" required placeholder="Ví dụ: KHAIGIANG20" className="rounded border bg-background px-3 py-2" /><select name="type" className="rounded border bg-background px-3 py-2"><option value="percent">Phần trăm</option><option value="fixed">Số tiền cố định</option></select><input name="value" type="number" min="1" required placeholder="Giá trị" className="rounded border bg-background px-3 py-2" /><input name="usageLimit" type="number" min="1" placeholder="Giới hạn lượt dùng (không bắt buộc)" className="rounded border bg-background px-3 py-2" /><button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Tạo mã</button></form></section><section className="rounded-lg border p-5"><h2 className="font-semibold">Tạo payout theo kỳ</h2><form action={runPayout} className="mt-4 flex gap-3"><input name="period" type="month" required className="rounded border bg-background px-3 py-2" /><button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Tạo payout</button></form></section></div><section className="mt-8"><h2 className="font-semibold">Mã đã tạo</h2><div className="mt-3 overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Mã</th><th className="p-3">Loại</th><th className="p-3">Giá trị</th><th className="p-3">Đã dùng</th></tr></thead><tbody>{coupons?.map((coupon) => <tr key={String(coupon.id)} className="border-b"><td className="p-3 font-medium">{String(coupon.code)}</td><td className="p-3">{coupon.type === "percent" ? "%" : "VNĐ"}</td><td className="p-3">{Number(coupon.value).toLocaleString("vi-VN")}</td><td className="p-3">{Number(coupon.used_count)}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}</td></tr>)}</tbody></table></div></section>
    </main>
  );
}
